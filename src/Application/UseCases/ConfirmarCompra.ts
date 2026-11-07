import type {
  IVentaRepository,
  VentaPayload,
} from '../../Domain/Repositories/IVentaRepository';
import type {
  IBoletosRepository,
  BoletoPayload,
} from '../../Domain/Repositories/IBoletosRepository';
import type { IAuditRepository } from '../../Domain/Repositories/IAuditRepository';
import type { IPaymentRepository } from '../../Domain/Repositories/IPaymentRepository';
import type { Boleto } from '../../Domain/Entities/Boleto';
import {
  EstadoVenta,
  EstadoBoleto,
  MetodoPago,
  TipoPasajero,
} from '../../Domain/Constants/EstadosSistema';
import { calcularEdad } from '../../Domain/Services/DescuentoService';
import { CalcularDescuentoVenta } from './CalcularDescuentoVenta';
import { ResolverPrecioAsiento } from './ResolverPrecioAsiento';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { SupabaseVentasRepository } from '../../Infrastructure/Repositories/SupabaseVentasRepository';
import { SupabaseBoletosRepository } from '../../Infrastructure/Repositories/SupabaseBoletosRepository';
import { SupabasePaymentRepository } from '../../Infrastructure/Repositories/SupabasePaymentRepository';

export type MetodoPagoCompra =
  | typeof MetodoPago.TRANSFERENCIA
  | typeof MetodoPago.TARJETA
  | typeof MetodoPago.EFECTIVO;

export type CanalCompra = 'online' | 'ventanilla';

/**
 * Datos de un pasajero dentro de una compra con varios asientos.
 * `precioUnitario` solo se usa como respaldo en flujos heredados; cuando el
 * caso de uso tiene `ResolverPrecioAsiento`, la tarifa se lee de la base de
 * datos y se ignora cualquier precio enviado por el cliente.
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
  /** Tarifa de respaldo para flujos heredados. No es la fuente de verdad. */
  precioUnitario?: number;
  capturaArchivo?: File | Blob | null;
  metodoPago: MetodoPagoCompra;
  stripeId?: string;
  /** Rol del usuario que ejecuta la compra, necesario para cobros en efectivo. */
  rolUsuario?: string | null;
  /** `online` no permite efectivo; `ventanilla` exige rol oficinista/admin. */
  canal?: CanalCompra;
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

export type DescuentoBoleto = {
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

export type ResultadoReservaCompra = {
  ventaId: number;
  comprobanteUrl: string | null;
  total: number;
  estado: EstadoVenta;
  stripePaymentIntentId: string | null;
  descuento: DescuentoBoleto | null;
  descuentos: DescuentoBoleto[];
  boletos: Boleto[];
};

export type ResultadoConfirmacionCompra = ResultadoReservaCompra;

export type OpcionesConfirmarReserva = {
  metodoPago: MetodoPagoCompra;
  stripeId?: string;
  total?: number;
  aprobadoPorId?: string | number | null;
};

const ROLES_EFECTIVO = ['oficinista', 'admin'];
const ESTADOS_PAGO_VALIDOS = ['succeeded', 'requires_capture'];

export class ConfirmarCompra {
  constructor(
    private ventaRepo: IVentaRepository = new SupabaseVentasRepository(),
    private boletosRepo: IBoletosRepository = new SupabaseBoletosRepository(),
    private auditRepo?: IAuditRepository,
    private calcularDescuentoUseCase: CalcularDescuentoVenta = new CalcularDescuentoVenta(),
    private resolverPrecios?: ResolverPrecioAsiento,
    private paymentRepo?: IPaymentRepository,
  ) {}

  /**
   * Crea la venta y sus boletos sin dar por hecho el pago. Es el primer paso
   * del flujo online: reservar → cobrar → verificar → confirmar.
   */
  async reservar(input: ConfirmInput): Promise<ResultadoReservaCompra> {
    this.validarEntrada(input);

    const pasajeros = this.normalizarPasajeros(input);
    const precios = await this.resolverPreciosPasajeros(pasajeros, input);
    const pasajerosConPrecio = pasajeros.map((pasajero) => ({
      ...pasajero,
      precioUnitario: precios.get(pasajero.asientoId)!,
    }));

    // ---- 1. Verificar disponibilidad justo antes de reservar ----
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

    // ---- 2. Resolver comprobante y método ----
    const { comprobanteUrl, realMetodoPago } = await this.resolverPago(input);

    // ---- 3. Calcular descuento y total por pasajero ----
    const pasajerosTarifados = pasajerosConPrecio.map((pasajero) =>
      this.calcularTarifaPasajero(pasajero),
    );
    const total = this.redondear(
      pasajerosTarifados.reduce(
        (acumulado, pasajero) => acumulado + pasajero.descuento.precioFinal,
        0,
      ),
    );

    const estadoVenta =
      input.metodoPago === MetodoPago.EFECTIVO
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
      StripePaymentIntentId: input.stripeId ?? null,
      AprobadoPorId:
        estadoVenta === EstadoVenta.APROBADA_PAGO && input.usuarioId != null
          ? String(input.usuarioId)
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

    // ---- 4. Insertar boletos ----
    const estadoBoleto = this.estadoBoletoPara(input.metodoPago);
    const boletosInsert = pasajerosTarifados.map((pasajero) =>
      this.construirBoleto(input, ventaId, pasajero, estadoBoleto),
    );

    let boletosRes: Boleto[] = [];
    try {
      boletosRes = await this.boletosRepo.insertarBoletos(boletosInsert);
    } catch (error: unknown) {
      try {
        await this.ventaRepo.cancelarVenta(ventaId);
      } catch {
        /* El error principal es el de la inserción; el rollback es best-effort. */
      }
      const detalle = error instanceof Error ? ` ${error.message}` : '';
      throw new DomainException(
        `No se pudieron generar los boletos. La compra fue revertida.${detalle}`,
        'ROLLBACK_COMPRA',
      );
    }

    await this.registrarAuditoria(input, ventaId, pasajeros.length);

    return {
      ventaId,
      comprobanteUrl,
      total,
      estado: estadoVenta,
      stripePaymentIntentId: input.stripeId ?? null,
      descuento: pasajerosTarifados[0]?.descuento ?? null,
      descuentos: pasajerosTarifados.map((pasajero) => pasajero.descuento),
      boletos: boletosRes,
    };
  }

  /**
   * Confirma una reserva ya creada. En tarjeta verifica el pago contra Stripe
   * (estado, monto y moneda) antes de emitir los boletos.
   */
  async confirmarReserva(
    ventaId: number,
    opciones: OpcionesConfirmarReserva,
  ): Promise<void> {
    if (!ventaId) {
      throw new DomainException('La venta a confirmar es inválida.', 'VENTA_REQUERIDA');
    }

    if (opciones.metodoPago === MetodoPago.TARJETA) {
      const stripeId = opciones.stripeId?.trim();
      if (!stripeId) {
        throw new DomainException(
          'No se recibió el identificador del pago con tarjeta.',
          'STRIPE_PAGO_REQUERIDO',
        );
      }

      await this.verificarPagoStripe(stripeId, await this.obtenerTotalVenta(ventaId, opciones.total));

      const aprobadoPorId =
        opciones.aprobadoPorId != null
          ? String(opciones.aprobadoPorId)
          : null;
      await this.ventaRepo.confirmarVentaTarjeta(
        ventaId,
        stripeId,
        aprobadoPorId,
      );
    } else {
      const aprobadoPorId =
        opciones.aprobadoPorId != null
          ? String(opciones.aprobadoPorId)
          : null;
      await this.ventaRepo.aprobarVenta(ventaId, aprobadoPorId);
    }

    await this.boletosRepo.actualizarEstadoPorVenta(
      ventaId,
      EstadoBoleto.EMITIDO,
    );
  }

  /**
   * Cancela la reserva y, si existe un cobro, solicita su cancelación o
   * reembolso. Se usa cuando falla la verificación o la emisión de boletos.
   */
  async cancelarReserva(ventaId: number, stripeId?: string): Promise<void> {
    await this.ventaRepo.cancelarVenta(ventaId);
    try {
      await this.boletosRepo.actualizarEstadoPorVenta(
        ventaId,
        EstadoBoleto.CANCELADO,
      );
    } catch (error: unknown) {
      console.warn('No se pudieron cancelar los boletos de la reserva:', error);
    }

    if (stripeId && this.paymentRepo) {
      try {
        await this.paymentRepo.cancelarPago(stripeId);
      } catch (error: unknown) {
        console.warn('No se pudo cancelar/reembolsar el pago de Stripe:', error);
      }
    }
  }

  /**
   * Flujo combinado para compatibilidad: reserva y confirma en una sola
   * llamada. En producción el flujo online usa `reservar` y `confirmarReserva`
   * por separado para cobrar entre ambos pasos.
   */
  async ejecutar(input: ConfirmInput): Promise<ResultadoConfirmacionCompra> {
    const reserva = await this.reservar(input);

    if (input.metodoPago === MetodoPago.TRANSFERENCIA) {
      return reserva;
    }

    if (input.metodoPago === MetodoPago.TARJETA) {
      try {
        await this.confirmarReserva(reserva.ventaId, {
          metodoPago: input.metodoPago,
          stripeId: input.stripeId,
          total: reserva.total,
          aprobadoPorId: input.usuarioId,
        });
      } catch (error: unknown) {
        await this.cancelarReserva(reserva.ventaId, input.stripeId);
        throw error;
      }

      return {
        ...reserva,
        estado: EstadoVenta.APROBADA_PAGO,
        stripePaymentIntentId: input.stripeId ?? null,
      };
    }

    return reserva;
  }

  private validarEntrada(input: ConfirmInput): void {
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

    if (input.metodoPago === MetodoPago.EFECTIVO) {
      this.validarPagoEfectivo(input);
    }

    if (input.metodoPago === MetodoPago.TRANSFERENCIA && !input.capturaArchivo) {
      throw new DomainException(
        'Debe adjuntar el comprobante de pago para Transferencia.',
        'COMPROBANTE_REQUERIDO',
      );
    }
  }

  private validarPagoEfectivo(input: ConfirmInput): void {
    if (input.canal === 'online') {
      throw new DomainException(
        'El pago en efectivo solo se registra en ventanilla.',
        'EFECTIVO_SOLO_VENTANILLA',
      );
    }

    const rol = String(input.rolUsuario ?? '').trim().toLowerCase();
    if (!ROLES_EFECTIVO.includes(rol)) {
      throw new DomainException(
        'Solo un oficinista o administrador puede registrar ventas en efectivo.',
        'ROL_NO_AUTORIZADO',
      );
    }
  }

  private async resolverPago(input: ConfirmInput): Promise<{
    comprobanteUrl: string | null;
    realMetodoPago: string;
  }> {
    if (input.metodoPago === MetodoPago.TRANSFERENCIA) {
      return {
        comprobanteUrl: await this.subirComprobante(input),
        realMetodoPago: MetodoPago.TRANSFERENCIA,
      };
    }

    if (input.metodoPago === MetodoPago.TARJETA) {
      return {
        comprobanteUrl: null,
        realMetodoPago: MetodoPago.TARJETA,
      };
    }

    return {
      comprobanteUrl: 'PAGO_DIRECTO',
      realMetodoPago: MetodoPago.EFECTIVO,
    };
  }

  private async subirComprobante(input: ConfirmInput): Promise<string> {
    const file = input.capturaArchivo as File | null;
    if (!file) {
      throw new DomainException(
        'Debe adjuntar el comprobante de pago para Transferencia.',
        'COMPROBANTE_REQUERIDO',
      );
    }

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
    const extension = fileName.includes('.') ? fileName.split('.').pop() : 'png';
    const uniqueId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2);
    const filePath = `${input.usuarioId ?? 'anon'}/${Date.now()}-${uniqueId}.${extension}`;

    if (!this.ventaRepo.uploadComprobante) {
      return `local-upload://${filePath}`;
    }

    try {
      const uploadRes = await this.ventaRepo.uploadComprobante(
        filePath,
        file,
        { contentType: file.type },
      );
      return uploadRes.publicUrl;
    } catch (error: unknown) {
      const detalle =
        error instanceof Error ? error.message : 'error desconocido';
      throw new DomainException(
        `No se pudo subir el comprobante: ${detalle}`,
        'UPLOAD_ERROR',
      );
    }
  }

  /**
   * Usa el total guardado en la venta (fuente de verdad del servidor) y solo
   * cae al valor recibido si la venta aún no está disponible.
   */
  private async obtenerTotalVenta(
    ventaId: number,
    totalRespaldo?: number,
  ): Promise<number | undefined> {
    try {
      const venta = await this.ventaRepo.obtenerVentaPorId(ventaId);
      if (venta && Number.isFinite(venta.total)) {
        return Number(venta.total);
      }
    } catch (error: unknown) {
      console.warn('No se pudo leer el total de la venta:', error);
    }
    return totalRespaldo;
  }

  private async verificarPagoStripe(
    stripeId: string,
    totalEsperado?: number,
  ): Promise<void> {
    if (!this.paymentRepo) {
      // Sin pasarela inyectada (tests heredados) solo se valida el formato.
      if (!/^pi_[A-Za-z0-9_]+$/.test(stripeId)) {
        throw new DomainException(
          'El identificador de pago con tarjeta no es válido.',
          'STRIPE_ID_INVALIDO',
        );
      }
      return;
    }

    const pago = await this.paymentRepo.verificarPago(stripeId);
    if (pago.id !== stripeId) {
      throw new DomainException(
        'Stripe devolvió un pago distinto al esperado.',
        'STRIPE_PAGO_INCONSISTENTE',
      );
    }
    if (!ESTADOS_PAGO_VALIDOS.includes(pago.status)) {
      throw new DomainException(
        `El pago quedó en estado "${pago.status}" y no puede confirmarse.`,
        'STRIPE_PAGO_NO_CONFIRMADO',
      );
    }

    if (totalEsperado != null) {
      const esperadoCentavos = Math.round(totalEsperado * 100);
      if (Number(pago.amount) !== esperadoCentavos) {
        throw new DomainException(
          'El monto cobrado en Stripe no coincide con el total de la compra.',
          'STRIPE_MONTO_INCONSISTENTE',
        );
      }
    }

    if (pago.currency && pago.currency.toLowerCase() !== 'usd') {
      throw new DomainException(
        'La moneda del pago con tarjeta no es válida.',
        'STRIPE_MONEDA_INVALIDA',
      );
    }
  }

  private async resolverPreciosPasajeros(
    pasajeros: PasajeroCompraInput[],
    input: ConfirmInput,
  ): Promise<Map<number, number>> {
    const asientos = pasajeros.map((pasajero) => pasajero.asientoId);

    if (this.resolverPrecios) {
      return this.resolverPrecios.ejecutar(asientos);
    }

    const precios = new Map<number, number>();
    for (const pasajero of pasajeros) {
      const precio = Number(pasajero.precioUnitario ?? input.precioUnitario);
      if (!Number.isFinite(precio) || precio <= 0) {
        throw new DomainException(
          `El precio del asiento ${pasajero.asientoId} no es válido.`,
          'PRECIO_INVALIDO',
        );
      }
      precios.set(pasajero.asientoId, precio);
    }
    return precios;
  }

  private estadoBoletoPara(metodoPago: MetodoPagoCompra): EstadoBoleto {
    if (metodoPago === MetodoPago.TRANSFERENCIA) {
      return EstadoBoleto.PROCESO_VALIDACION;
    }
    if (metodoPago === MetodoPago.TARJETA) {
      return EstadoBoleto.RESERVADO;
    }
    return EstadoBoleto.EMITIDO;
  }

  private construirBoleto(
    input: ConfirmInput,
    ventaId: number,
    pasajero: PasajeroTarifado,
    estado: EstadoBoleto,
  ): BoletoPayload {
    const unique =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2);
    const codigoQr = `QR-R${input.ruta.id}-V${ventaId}-A${pasajero.asientoId}-${unique}`;
    const codigoBarras = `BC-R${input.ruta.id}-V${ventaId}-A${pasajero.asientoId}-${unique}`;

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
      CodigoQr: codigoQr,
      CodigoBarras: codigoBarras,
      Estado: estado,
      CreatedAt: new Date().toISOString(),
    };
  }

  private async registrarAuditoria(
    input: ConfirmInput,
    ventaId: number,
    cantidadPasajeros: number,
  ): Promise<void> {
    if (!this.auditRepo || !input.usuarioId) return;

    try {
      await this.auditRepo.registrarEvento({
        accion: 'COMPRA_BOLETOS',
        usuarioId: String(input.usuarioId),
        entidadAfectada: 'Venta',
        entidadId: String(ventaId),
        detalle: `Compra por ${input.metodoPago} de ${cantidadPasajeros} boleto(s). Venta ID: ${ventaId}.`,
        resultado: 'Exito',
      });
    } catch (error: unknown) {
      console.warn('Omitiendo log de auditoría:', error);
    }
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

  private redondear(valor: number): number {
    return Number(valor.toFixed(2));
  }
}

export const confirmarCompraUseCase = new ConfirmarCompra(
  new SupabaseVentasRepository(),
  new SupabaseBoletosRepository(),
  undefined,
  new CalcularDescuentoVenta(),
  new ResolverPrecioAsiento(),
  new SupabasePaymentRepository(),
);
