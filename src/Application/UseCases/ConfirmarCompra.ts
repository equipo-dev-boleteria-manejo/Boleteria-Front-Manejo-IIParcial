import type {
  IVentaRepository,
  VentaPayload,
} from '../../Domain/Repositories/IVentaRepository';
import type {
  IBoletosRepository,
  BoletoPayload,
} from '../../Domain/Repositories/IBoletosRepository';
import type { IAuditRepository } from '../../Domain/Repositories/IAuditRepository';
import {
  EstadoVenta,
  EstadoBoleto,
  MetodoPago,
  TipoPasajero,
} from '../../Domain/Constants/EstadosSistema';
import { calcularEdad } from '../../Domain/Services/DescuentoService';
import { CalcularDescuentoVenta } from './CalcularDescuentoVenta';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { SupabaseVentasRepository } from '../../Infrastructure/Repositories/SupabaseVentasRepository';
import { SupabaseBoletosRepository } from '../../Infrastructure/Repositories/SupabaseBoletosRepository';

/**
 * Datos de un pasajero dentro de una compra con varios asientos.
 * `precioUnitario` permite tarifas distintas por tipo de asiento; si se omite
 * se usa el precio base de la compra.
 */
export type PasajeroCompraInput = {
  asientoId: number;
  nombres: string;
  apellidos: string;
  cedula: string;
  fechaNacimiento: string;
  tieneDiscapacidad?: boolean;
  precioUnitario?: number;
};

export type ConfirmInput = {
  ruta: {
    id: number;
    origen: string;
    destino: string;
  };
  asientos: number[]; // IDs de los asientos seleccionados
  precioUnitario: number;
  capturaArchivo?: File | Blob | null;
  metodoPago: 'Transferencia' | 'Tarjeta' | 'Efectivo';
  stripeId?: string;
  /**
   * Datos de un único pasajero. Se conservan por compatibilidad con el flujo
   * anterior; cuando se envían `pasajeros`, estos tienen prioridad.
   */
  nombres?: string;
  apellidos?: string;
  cedula?: string;
  fechaNacimiento?: string;
  tieneDiscapacidad?: boolean;
  usuarioId?: string | number | null;
  /** Un pasajero por asiento, con su propia tarifa y descuento. */
  pasajeros?: PasajeroCompraInput[];
};

type DescuentoBoleto = {
  esMenor: boolean;
  esDiscapacitado: boolean;
  esTerceraEdad: boolean;
  descuentoAplicado: number;
  precioFinal: number;
};

type PasajeroTarifado = PasajeroCompraInput & {
  precioUnitario: number;
  descuento: DescuentoBoleto;
  tipoPasajero: TipoPasajero;
};

export class ConfirmarCompra {
  constructor(
    private ventaRepo: IVentaRepository = new SupabaseVentasRepository(),
    private boletosRepo: IBoletosRepository = new SupabaseBoletosRepository(),
    private auditRepo?: IAuditRepository,
    private calcularDescuentoUseCase: CalcularDescuentoVenta = new CalcularDescuentoVenta(),
  ) {}

  async ejecutar(input: ConfirmInput) {
    // ---- 1. Validaciones de negocio ----
    if (!input.ruta || !input.ruta.id) {
      throw new DomainException('Ruta requerida.', 'RUTA_REQUERIDA');
    }
    if (!input.asientos || !input.asientos.length) {
      throw new DomainException(
        'Debe seleccionar al menos un asiento.',
        'ASIENTOS_REQUERIDOS',
      );
    }
    if (!input.metodoPago) {
      throw new DomainException(
        'Método de pago requerido.',
        'METODO_PAGO_REQUERIDO',
      );
    }
    if (!Number.isFinite(input.precioUnitario) || input.precioUnitario <= 0) {
      throw new DomainException(
        'El precio del asiento no es válido.',
        'PRECIO_INVALIDO',
      );
    }

    const pasajeros = this.normalizarPasajeros(input);

    // El comprobante es obligatorio para Transferencia
    if (input.metodoPago === 'Transferencia' && !input.capturaArchivo) {
      throw new DomainException(
        'Debe adjuntar el comprobante de pago para Transferencia.',
        'COMPROBANTE_REQUERIDO',
      );
    }

    // ---- 2. Verificar disponibilidad de cada asiento justo antes de confirmar ----
    for (const asientoId of input.asientos) {
      const disponible = await this.boletosRepo.verificarAsientoDisponible(
        input.ruta.id,
        asientoId,
      );
      if (!disponible) {
        throw new DomainException(
          `El asiento ${asientoId} ya no está disponible. Vuelve a buscar la ruta.`,
          'ASIENTO_NO_DISPONIBLE',
        );
      }
    }

    // ---- 3. Resolver comprobante y método según la forma de pago ----
    let comprobanteUrl = 'PAGO_DIRECTO';
    let realMetodoPago: string = input.metodoPago;

    if (input.metodoPago === 'Transferencia' && input.capturaArchivo) {
      const file = input.capturaArchivo as File;
      const tiposPermitidos = [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'application/pdf',
      ];
      if (file.type && !tiposPermitidos.includes(file.type)) {
        throw new DomainException(
          'El comprobante debe ser una imagen (PNG/JPG/WEBP) o un PDF.',
          'FORMATO_INVALIDO',
        );
      }
      const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
      if (file.size && file.size > MAX_BYTES) {
        throw new DomainException(
          'El comprobante supera el tamaño máximo permitido (5 MB).',
          'ARCHIVO_EXCEDE_TAMANIO',
        );
      }

      const fileName = file.name || 'comprobante.png';
      const extension = fileName.includes('.')
        ? fileName.split('.').pop()
        : 'png';
      const uniqueId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2);
      const filePath = `${input.usuarioId ?? 'anon'}/${Date.now()}-${uniqueId}.${extension}`;

      if (this.ventaRepo.uploadComprobante) {
        try {
          const uploadRes = await this.ventaRepo.uploadComprobante(
            filePath,
            file,
            { contentType: file.type },
          );
          comprobanteUrl = uploadRes.publicUrl;
        } catch (e: any) {
          throw new DomainException(
            'No se pudo subir el comprobante: ' +
              (e?.message || 'error desconocido'),
            'UPLOAD_ERROR',
          );
        }
      } else {
        comprobanteUrl = `local-upload://${filePath}`;
      }
    }

    if (input.metodoPago === 'Tarjeta') {
      realMetodoPago = MetodoPago.TRANSFERENCIA;
      comprobanteUrl = `STRIPE_ID:${input.stripeId || 'STRIPE_PAYMENT'}`;
    }

    // ---- 4. Calcular descuento y total por pasajero ----
    const pasajerosTarifados = pasajeros.map((pasajero) =>
      this.calcularTarifaPasajero(pasajero),
    );
    const total = Number(
      pasajerosTarifados
        .reduce(
          (acumulado, pasajero) => acumulado + pasajero.descuento.precioFinal,
          0,
        )
        .toFixed(2),
    );

    // ---- 5. Crear la Venta ----
    const estadoVenta =
      input.metodoPago === 'Tarjeta' || input.metodoPago === 'Efectivo'
        ? EstadoVenta.APROBADA_PAGO
        : EstadoVenta.PENDIENTE;

    const ventaPayload: VentaPayload = {
      UsuarioVendedorId:
        input.usuarioId != null ? String(input.usuarioId) : null,
      RutaId: input.ruta.id,
      CiudadOrigenVenta: input.ruta.origen,
      CiudadDestinoVenta: input.ruta.destino,
      Total: total,
      Estado: estadoVenta,
      MetodoPago: realMetodoPago,
      ComprobanteUrl: comprobanteUrl,
      AprobadoPorId:
        estadoVenta === EstadoVenta.APROBADA_PAGO
          ? input.usuarioId
            ? String(input.usuarioId)
            : null
          : null,
      FechaVenta: new Date().toISOString(),
    };

    const ventaId = await this.ventaRepo.crearVenta(ventaPayload);
    if (!ventaId) {
      throw new DomainException(
        'No se pudo crear el registro de venta.',
        'VENTA_CREACION_FALLIDA',
      );
    }

    // ---- 6. Generar e Insertar Boletos ----
    // Las transferencias quedan pendientes de validación hasta que un
    // oficinista apruebe el comprobante.
    const estadoBoleto =
      input.metodoPago === 'Transferencia'
        ? EstadoBoleto.PROCESO_VALIDACION
        : EstadoBoleto.EMITIDO;

    const boletosInsert: BoletoPayload[] = pasajerosTarifados.map(
      (pasajero) => {
        const unique =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2);
        const qrCode = `QR-R${input.ruta.id}-V${ventaId}-A${pasajero.asientoId}-${unique}`;
        const barcode = `BC-R${input.ruta.id}-V${ventaId}-A${pasajero.asientoId}-${unique}`;

        return {
          VentaId: ventaId,
          RutaId: input.ruta.id,
          AsientoId: pasajero.asientoId,
          NombresPasajero: pasajero.nombres.trim(),
          ApellidosPasajero: pasajero.apellidos.trim(),
          CedulaPasajero: pasajero.cedula.trim(),
          FechaNacimiento: pasajero.fechaNacimiento,
          EsMenor: pasajero.descuento.esMenor,
          EsDiscapacitado: pasajero.descuento.esDiscapacitado,
          EsTerceraEdad: pasajero.descuento.esTerceraEdad,
          TipoPasajero: pasajero.tipoPasajero,
          DescuentoAplicado: pasajero.descuento.descuentoAplicado,
          PrecioFinal: pasajero.descuento.precioFinal,
          CodigoQr: qrCode,
          CodigoBarras: barcode,
          Estado: estadoBoleto,
          CreatedAt: new Date().toISOString(),
        };
      },
    );

    let boletosRes: any[] = [];
    try {
      boletosRes = await this.boletosRepo.insertarBoletos(boletosInsert);
    } catch (e: any) {
      // Rollback lógico: si falla la inserción de boletos, cancelar la venta
      try {
        await this.ventaRepo.cancelarVenta(ventaId);
      } catch {
        /* silenciar error secundario de rollback */
      }
      throw new DomainException(
        'No se pudieron generar los boletos. La compra fue revertida: ' +
          (e?.message || ''),
        'ROLLBACK_COMPRA',
      );
    }

    // ---- 7. Auditoría opcional ----
    if (this.auditRepo && input.usuarioId) {
      try {
        await this.auditRepo.registrarEvento({
          accion: 'COMPRA_BOLETOS',
          usuarioId: String(input.usuarioId),
          entidadAfectada: 'Venta',
          entidadId: String(ventaId),
          detalle: `Compra por ${input.metodoPago} de ${pasajeros.length} boleto(s). Venta ID: ${ventaId}.`,
          resultado: 'Exito',
        });
      } catch (e) {
        console.warn('Omitiendo log de auditoría:', e);
      }
    }

    return {
      ventaId,
      comprobanteUrl,
      total,
      descuento: pasajerosTarifados[0]?.descuento ?? null,
      descuentos: pasajerosTarifados.map((pasajero) => pasajero.descuento),
      boletos: boletosRes,
    };
  }

  /**
   * Si llega `pasajeros`, exige exactamente un pasajero por asiento y sin
   * asientos repetidos. Si no, expande el pasajero único a todos los asientos
   * para conservar el comportamiento histórico del flujo de compra.
   */
  private normalizarPasajeros(input: ConfirmInput): PasajeroCompraInput[] {
    const asientos = new Set(input.asientos);

    if (input.pasajeros?.length) {
      if (input.pasajeros.length !== input.asientos.length) {
        throw new DomainException(
          'Debe registrar un pasajero por cada asiento seleccionado.',
          'PASAJEROS_INCOMPLETOS',
        );
      }

      const asientosVistos = new Set<number>();
      const cedulasVistas = new Set<string>();
      return input.pasajeros.map((pasajero) => {
        if (!Number.isInteger(pasajero.asientoId) || !asientos.has(pasajero.asientoId)) {
          throw new DomainException(
            `El pasajero está asociado a un asiento no seleccionado (${pasajero.asientoId}).`,
            'ASIENTO_PASAJERO_INVALIDO',
          );
        }
        if (asientosVistos.has(pasajero.asientoId)) {
          throw new DomainException(
            `El asiento ${pasajero.asientoId} tiene más de un pasajero.`,
            'ASIENTO_DUPLICADO',
          );
        }
        asientosVistos.add(pasajero.asientoId);
        this.validarDatosPasajero(pasajero);

        const cedulaNormalizada = pasajero.cedula.trim();
        if (cedulasVistas.has(cedulaNormalizada)) {
          throw new DomainException(
            `La cédula ${cedulaNormalizada} no puede repetirse en varios asientos.`,
            'CEDULA_DUPLICADA',
          );
        }
        cedulasVistas.add(cedulaNormalizada);

        return {
          ...pasajero,
          precioUnitario: pasajero.precioUnitario ?? input.precioUnitario,
        };
      });
    }

    const pasajeroUnico: PasajeroCompraInput = {
      asientoId: input.asientos[0],
      nombres: input.nombres ?? '',
      apellidos: input.apellidos ?? '',
      cedula: input.cedula ?? '',
      fechaNacimiento: input.fechaNacimiento ?? '',
      tieneDiscapacidad: input.tieneDiscapacidad,
      precioUnitario: input.precioUnitario,
    };
    this.validarDatosPasajero(pasajeroUnico);

    return input.asientos.map((asientoId) => ({
      ...pasajeroUnico,
      asientoId,
    }));
  }

  private validarDatosPasajero(pasajero: PasajeroCompraInput): void {
    if (!pasajero.cedula?.trim()) {
      throw new DomainException(
        'Cédula del pasajero requerida.',
        'CEDULA_REQUERIDA',
      );
    }
    if (!pasajero.nombres?.trim()) {
      throw new DomainException(
        'Nombres del pasajero requeridos.',
        'NOMBRES_REQUERIDOS',
      );
    }
    if (!pasajero.apellidos?.trim()) {
      throw new DomainException(
        'Apellidos del pasajero requeridos.',
        'APELLIDOS_REQUERIDOS',
      );
    }
    if (!pasajero.fechaNacimiento?.trim()) {
      throw new DomainException(
        'Fecha de nacimiento requerida.',
        'FECHA_NACIMIENTO_REQUERIDA',
      );
    }
  }

  private calcularTarifaPasajero(
    pasajero: PasajeroCompraInput,
  ): PasajeroTarifado {
    const precioBase = Number(pasajero.precioUnitario);
    if (!Number.isFinite(precioBase) || precioBase <= 0) {
      throw new DomainException(
        `El precio del asiento ${pasajero.asientoId} no es válido.`,
        'PRECIO_INVALIDO',
      );
    }

    const edadPasajero = calcularEdad(pasajero.fechaNacimiento);
    if (edadPasajero < 0) {
      throw new DomainException(
        `La fecha de nacimiento del asiento ${pasajero.asientoId} no es válida.`,
        'FECHA_NACIMIENTO_INVALIDA',
      );
    }

    const resultadoDescuento = this.calcularDescuentoUseCase.ejecutar({
      numeroCedula: pasajero.cedula.trim(),
      edad: edadPasajero,
      tieneDiscapacidad: !!pasajero.tieneDiscapacidad,
      precioBase,
    });

    const descuento: DescuentoBoleto = {
      esMenor: resultadoDescuento.categoria === 'MENOR',
      esDiscapacitado: resultadoDescuento.categoria === 'DISCAPACIDAD',
      esTerceraEdad: resultadoDescuento.categoria === 'TERCERA_EDAD',
      descuentoAplicado: resultadoDescuento.porcentajeDescuento,
      precioFinal: resultadoDescuento.precioFinal,
    };

    let tipoPasajero: TipoPasajero = TipoPasajero.GENERAL;
    if (descuento.esDiscapacitado) {
      tipoPasajero = TipoPasajero.DISCAPACITADO;
    } else if (descuento.esTerceraEdad) {
      tipoPasajero = TipoPasajero.TERCERA_EDAD;
    } else if (descuento.esMenor) {
      tipoPasajero = TipoPasajero.MENOR_EDAD;
    }

    return {
      ...pasajero,
      precioUnitario: precioBase,
      descuento,
      tipoPasajero,
    };
  }
}

export const confirmarCompraUseCase = new ConfirmarCompra();
