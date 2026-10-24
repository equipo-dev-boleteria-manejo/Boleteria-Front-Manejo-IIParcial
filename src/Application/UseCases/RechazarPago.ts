import type { IVentaRepository } from '../../Domain/Repositories/IVentaRepository';
import type { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { EstadoVenta, EstadoBoleto } from '../../Domain/Constants/EstadosSistema';
import { SupabaseVentasRepository } from '../../Infrastructure/Repositories/SupabaseVentasRepository';
import { SupabaseBoletosRepository } from '../../Infrastructure/Repositories/SupabaseBoletosRepository';

export class RechazarPago {
  constructor(
    private ventaRepo: IVentaRepository = new SupabaseVentasRepository(),
    private boletosRepo: IBoletosRepository = new SupabaseBoletosRepository(),
  ) {}

  async ejecutar(
    ventaId: number,
    aprobadoPorId: string,
    observacion?: string,
  ): Promise<void> {
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
      throw new DomainException('Solo se pueden rechazar ventas pendientes.', 'VENTA_NO_PENDIENTE');
    }

    await this.ventaRepo.rechazarVenta(ventaId, aprobadoPorId, observacion);
    await this.boletosRepo.actualizarEstadoPorVenta(ventaId, EstadoBoleto.CANCELADO);
  }
}

export const rechazarPagoUseCase = new RechazarPago();
