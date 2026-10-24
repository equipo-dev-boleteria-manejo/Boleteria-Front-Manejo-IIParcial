import type { IVentaRepository } from '../../Domain/Repositories/IVentaRepository';
import type { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { EstadoVenta, EstadoBoleto } from '../../Domain/Constants/EstadosSistema';
import { SupabaseVentasRepository } from '../../Infrastructure/Repositories/SupabaseVentasRepository';
import { SupabaseBoletosRepository } from '../../Infrastructure/Repositories/SupabaseBoletosRepository';

export class AprobarPago {
  constructor(
    private ventaRepo: IVentaRepository = new SupabaseVentasRepository(),
    private boletosRepo: IBoletosRepository = new SupabaseBoletosRepository(),
  ) {}

  async ejecutar(ventaId: number, aprobadoPorId: string): Promise<void> {
    if (!ventaId) {
      throw new DomainException('Debe seleccionar una venta.', 'VENTA_REQUERIDA');
    }

    if (!aprobadoPorId?.trim()) {
      throw new DomainException('No se encontró el usuario oficinista autenticado.', 'OFICINISTA_REQUERIDO');
    }

    const venta = await this.ventaRepo.obtenerVentaPorId(ventaId);

    if (!venta) {
      throw new DomainException('La venta no existe.', 'VENTA_NO_ENCONTRADA');
    }

    const estadoVenta = venta.estado ?? (venta as any).Estado;
    if (estadoVenta !== EstadoVenta.PENDIENTE) {
      throw new DomainException('Solo se pueden aprobar ventas pendientes.', 'VENTA_NO_PENDIENTE');
    }

    const comprobanteUrl = venta.comprobanteUrl ?? (venta as any).ComprobanteUrl;
    if (!comprobanteUrl) {
      throw new DomainException('No se puede aprobar una venta sin comprobante.', 'COMPROBANTE_FALTANTE');
    }

    const boletos = await this.boletosRepo.obtenerBoletosPorVenta(ventaId);

    if (!boletos || !boletos.length) {
      throw new DomainException('No se puede aprobar una venta sin boletos asociados.', 'SIN_BOLETOS');
    }

    await this.ventaRepo.aprobarVenta(ventaId, aprobadoPorId);
    await this.boletosRepo.actualizarEstadoPorVenta(ventaId, EstadoBoleto.EMITIDO);
  }
}

export const aprobarPagoUseCase = new AprobarPago();
