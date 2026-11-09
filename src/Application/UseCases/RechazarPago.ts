import type { IVentaRepository } from '../../Domain/Repositories/IVentaRepository';
import type { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository';
import type { IAuditRepository } from '../../Domain/Repositories/IAuditRepository';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { EstadoVenta, EstadoBoleto } from '../../Domain/Constants/EstadosSistema';
import { SupabaseVentasRepository } from '../../Infrastructure/Repositories/SupabaseVentasRepository';
import { SupabaseBoletosRepository } from '../../Infrastructure/Repositories/SupabaseBoletosRepository';
import { SupabaseAuditRepository } from '../../Infrastructure/Repositories/SupabaseAuditRepository';

export class RechazarPago {
  constructor(
    private ventaRepo: IVentaRepository = new SupabaseVentasRepository(),
    private boletosRepo: IBoletosRepository = new SupabaseBoletosRepository(),
    private auditRepo?: IAuditRepository,
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

    if (this.auditRepo) {
      this.auditRepo.registrarEvento({
        accion: 'RECHAZAR_PAGO_TRANSFERENCIA',
        usuarioId: aprobadoPorId,
        entidadAfectada: 'Ventas',
        entidadId: ventaId,
        detalle: `Transferencia bancaria rechazada para la Venta #${ventaId}. Motivo: ${observacion || 'Sin motivo especificado'}.`,
        resultado: 'Fallo',
      }).catch(() => {});
    }
  }
}

export const rechazarPagoUseCase = new RechazarPago(
  new SupabaseVentasRepository(),
  new SupabaseBoletosRepository(),
  new SupabaseAuditRepository()
);
