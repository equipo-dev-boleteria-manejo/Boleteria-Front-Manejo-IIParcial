import type { IVentaRepository, VentaPayload } from '../../Domain/Repositories/IVentaRepository';
import type { IBoletosRepository, BoletoPayload } from '../../Domain/Repositories/IBoletosRepository';
import type { IAuditRepository } from '../../Domain/Repositories/IAuditRepository';
import {
  calcularDescuentoBoleto,
  EstadoVenta,
  EstadoBoleto,
  MetodoPago,
  TipoPasajero,
} from '../../Domain/Constants/EstadosSistema';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { SupabaseVentasRepository } from '../../Infrastructure/Repositories/SupabaseVentasRepository';
import { SupabaseBoletosRepository } from '../../Infrastructure/Repositories/SupabaseBoletosRepository';

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
  nombres: string;
  apellidos: string;
  cedula: string;
  fechaNacimiento: string;
  tieneDiscapacidad?: boolean;
  usuarioId?: string | number | null;
};

export class ConfirmarCompra {
  constructor(
    private ventaRepo: IVentaRepository = new SupabaseVentasRepository(),
    private boletosRepo: IBoletosRepository = new SupabaseBoletosRepository(),
    private auditRepo?: IAuditRepository,
  ) {}

  async ejecutar(input: ConfirmInput) {
    // ---- 1. Validaciones de negocio ----
    if (!input.ruta || !input.ruta.id) {
      throw new DomainException('Ruta requerida.', 'RUTA_REQUERIDA');
    }
    if (!input.asientos || !input.asientos.length) {
      throw new DomainException('Debe seleccionar al menos un asiento.', 'ASIENTOS_REQUERIDOS');
    }
    if (!input.cedula?.trim()) {
      throw new DomainException('Cédula del pasajero requerida.', 'CEDULA_REQUERIDA');
    }
    if (!input.nombres?.trim()) {
      throw new DomainException('Nombres del pasajero requeridos.', 'NOMBRES_REQUERIDOS');
    }
    if (!input.apellidos?.trim()) {
      throw new DomainException('Apellidos del pasajero requeridos.', 'APELLIDOS_REQUERIDOS');
    }
    if (!input.fechaNacimiento?.trim()) {
      throw new DomainException('Fecha de nacimiento requerida.', 'FECHA_NACIMIENTO_REQUERIDA');
    }
    if (!input.metodoPago) {
      throw new DomainException('Método de pago requerido.', 'METODO_PAGO_REQUERIDO');
    }
    if (input.precioUnitario <= 0) {
      throw new DomainException('El precio del asiento no es válido.', 'PRECIO_INVALIDO');
    }

    // El comprobante es obligatorio para Transferencia
    if (input.metodoPago === 'Transferencia' && !input.capturaArchivo) {
      throw new DomainException('Debe adjuntar el comprobante de pago para Transferencia.', 'COMPROBANTE_REQUERIDO');
    }

    // ---- 2. Verificar disponibilidad de cada asiento justo antes de confirmar ----
    for (const asientoId of input.asientos) {
      const disponible = await this.boletosRepo.verificarAsientoDisponible(input.ruta.id, asientoId);
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
      const tiposPermitidos = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
      if (file.type && !tiposPermitidos.includes(file.type)) {
        throw new DomainException('El comprobante debe ser una imagen (PNG/JPG/WEBP) o un PDF.', 'FORMATO_INVALIDO');
      }
      const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
      if (file.size && file.size > MAX_BYTES) {
        throw new DomainException('El comprobante supera el tamaño máximo permitido (5 MB).', 'ARCHIVO_EXCEDE_TAMANIO');
      }

      const fileName = file.name || 'comprobante.png';
      const extension = fileName.includes('.') ? fileName.split('.').pop() : 'png';
      const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      const filePath = `${input.usuarioId ?? 'anon'}/${Date.now()}-${uniqueId}.${extension}`;

      if (this.ventaRepo.uploadComprobante) {
        try {
          const uploadRes = await this.ventaRepo.uploadComprobante(filePath, file, {
            contentType: file.type,
          });
          comprobanteUrl = uploadRes.publicUrl;
        } catch (e: any) {
          throw new DomainException('No se pudo subir el comprobante: ' + (e?.message || 'error desconocido'), 'UPLOAD_ERROR');
        }
      } else {
        comprobanteUrl = `local-upload://${filePath}`;
      }
    }

    if (input.metodoPago === 'Tarjeta') {
      realMetodoPago = MetodoPago.TRANSFERENCIA;
      comprobanteUrl = `STRIPE_ID:${input.stripeId || 'STRIPE_PAYMENT'}`;
    }

    // ---- 4. Calcular descuento y total ----
    const descuento = calcularDescuentoBoleto(
      input.fechaNacimiento,
      !!input.tieneDiscapacidad,
      input.precioUnitario,
    );
    const total = Number((descuento.precioFinal * input.asientos.length).toFixed(2));

    // Determinar tipo de pasajero según reglas de descuento
    let tipoPasajero = TipoPasajero.GENERAL;
    if (descuento.esDiscapacitado) {
      tipoPasajero = TipoPasajero.DISCAPACITADO;
    } else if (descuento.esTerceraEdad) {
      tipoPasajero = TipoPasajero.TERCERA_EDAD;
    } else if (descuento.esMenor) {
      tipoPasajero = TipoPasajero.MENOR_EDAD;
    }

    // ---- 5. Crear la Venta ----
    const estadoVenta =
      input.metodoPago === 'Tarjeta' || input.metodoPago === 'Efectivo'
        ? EstadoVenta.APROBADA_PAGO
        : EstadoVenta.PENDIENTE;

    const ventaPayload: VentaPayload = {
      UsuarioVendedorId: input.usuarioId != null ? String(input.usuarioId) : null,
      RutaId: input.ruta.id,
      CiudadOrigenVenta: input.ruta.origen,
      CiudadDestinoVenta: input.ruta.destino,
      Total: total,
      Estado: estadoVenta,
      MetodoPago: realMetodoPago,
      ComprobanteUrl: comprobanteUrl,
      AprobadoPorId: estadoVenta === EstadoVenta.APROBADA_PAGO ? (input.usuarioId ? String(input.usuarioId) : null) : null,
      FechaVenta: new Date().toISOString(),
    };

    const ventaId = await this.ventaRepo.crearVenta(ventaPayload);
    if (!ventaId) {
      throw new DomainException('No se pudo crear el registro de venta.', 'VENTA_CREACION_FALLIDA');
    }

    // ---- 6. Generar e Insertar Boletos ----
    const boletosInsert: BoletoPayload[] = input.asientos.map((asientoId) => {
      const unique = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      const qrCode = `QR-R${input.ruta.id}-V${ventaId}-A${asientoId}-${unique}`;
      const barcode = `BC-R${input.ruta.id}-V${ventaId}-A${asientoId}-${unique}`;

      return {
        VentaId: ventaId,
        RutaId: input.ruta.id,
        AsientoId: asientoId,
        NombresPasajero: input.nombres.trim(),
        ApellidosPasajero: input.apellidos.trim(),
        CedulaPasajero: input.cedula.trim(),
        FechaNacimiento: input.fechaNacimiento,
        EsMenor: descuento.esMenor,
        EsDiscapacitado: descuento.esDiscapacitado,
        EsTerceraEdad: descuento.esTerceraEdad,
        TipoPasajero: tipoPasajero,
        DescuentoAplicado: descuento.descuentoAplicado,
        PrecioFinal: descuento.precioFinal,
        CodigoQr: qrCode,
        CodigoBarras: barcode,
        Estado: EstadoBoleto.EMITIDO,
        CreatedAt: new Date().toISOString(),
      };
    });

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
        'No se pudieron generar los boletos. La compra fue revertida: ' + (e?.message || ''),
        'ROLLBACK_COMPRA',
      );
    }

    // ---- 7. Auditoría opcional ----
    if (this.auditRepo && input.usuarioId) {
      try {
        await this.auditRepo.logCambio({
          usuarioId: String(input.usuarioId),
          tipoCambio: 'estandar',
          descripcion: `Compra por ${input.metodoPago}. Venta ID: ${ventaId}.`,
          referenciaId: ventaId,
        });
      } catch (e) {
        console.warn('Omitiendo log de auditoría:', e);
      }
    }

    return {
      ventaId,
      comprobanteUrl,
      total,
      descuento,
      boletos: boletosRes,
    };
  }
}

export const confirmarCompraUseCase = new ConfirmarCompra();
