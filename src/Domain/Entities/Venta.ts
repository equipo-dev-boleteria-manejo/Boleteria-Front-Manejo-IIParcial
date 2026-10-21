/**
 * Venta.ts - Entidad de Dominio: Transacción de Venta
 *
 * Representa la orden comercial de compra de boletos para una ruta específica,
 * registrando el total recaudado, el método de pago y el estado de validación.
 */

import { EstadoVenta, MetodoPago } from '../Constants/EstadosSistema';
import { VentaNoModificableException } from '../Exceptions/VentaException';

export class Venta {
  public id?: number;
  public usuarioVendedorId?: string | null;
  public comprobanteUrl?: string | null;
  public aprobadoPorId?: string | null;
  public fechaVenta?: Date;

  constructor(
    public rutaId: number,
    public ciudadOrigenVenta: string,
    public ciudadDestinoVenta: string,
    public total: number,
    public estado: EstadoVenta = EstadoVenta.PENDIENTE,
    public metodoPago: MetodoPago = MetodoPago.EFECTIVO,
  ) {}

  esValida(): boolean {
    const origenNorm = this.ciudadOrigenVenta?.trim().toLowerCase();
    const destinoNorm = this.ciudadDestinoVenta?.trim().toLowerCase();

    return (
      Number.isInteger(this.rutaId) &&
      this.rutaId > 0 &&
      Boolean(origenNorm && origenNorm.length > 0) &&
      Boolean(destinoNorm && destinoNorm.length > 0) &&
      origenNorm !== destinoNorm &&
      Number.isFinite(this.total) &&
      this.total >= 0 &&
      Object.values(EstadoVenta).includes(this.estado) &&
      Object.values(MetodoPago).includes(this.metodoPago)
    );
  }

  aprobar(aprobadorId: string): void {
    if (this.estado === EstadoVenta.CANCELADA) {
      throw new VentaNoModificableException(this.id ?? 0, this.estado);
    }
    this.estado = EstadoVenta.APROBADA_PAGO;
    this.aprobadoPorId = aprobadorId;
  }

  cancelar(): void {
    if (this.estado === EstadoVenta.CANCELADA) {
      throw new VentaNoModificableException(this.id ?? 0, this.estado);
    }
    this.estado = EstadoVenta.CANCELADA;
  }

  adjuntarComprobante(url: string): void {
    if (this.estado === EstadoVenta.CANCELADA) {
      throw new VentaNoModificableException(this.id ?? 0, this.estado);
    }
    this.comprobanteUrl = url.trim();
  }

  puedeModificarse(): boolean {
    return this.estado === EstadoVenta.PENDIENTE;
  }
}
