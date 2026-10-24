import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RechazarPago } from './RechazarPago';
import type { IVentaRepository } from '../../Domain/Repositories/IVentaRepository';
import type { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository';
import { Venta } from '../../Domain/Entities/Venta';
import { EstadoVenta, EstadoBoleto, MetodoPago } from '../../Domain/Constants/EstadosSistema';

describe('RechazarPago (Caso de Uso)', () => {
  let mockVentaRepo: IVentaRepository;
  let mockBoletosRepo: IBoletosRepository;
  let useCase: RechazarPago;

  beforeEach(() => {
    mockVentaRepo = {
      crearVenta: vi.fn(),
      cancelarVenta: vi.fn(),
      obtenerVentaPorId: vi.fn(),
      obtenerVentasPendientes: vi.fn(),
      obtenerVentasPorRuta: vi.fn(),
      aprobarVenta: vi.fn(),
      rechazarVenta: vi.fn().mockResolvedValue(undefined),
      migrarVentasARuta: vi.fn(),
    };

    mockBoletosRepo = {
      insertarBoletos: vi.fn(),
      actualizarEstadoPorVenta: vi.fn().mockResolvedValue(undefined),
      obtenerBoletosPorVenta: vi.fn(),
      obtenerBoletosPorRuta: vi.fn(),
      obtenerBoletosPorUsuario: vi.fn(),
      verificarAsientoDisponible: vi.fn(),
      obtenerAsientosDisponiblesPorRuta: vi.fn(),
      obtenerAsientosOcupadosPorRuta: vi.fn(),
      obtenerBoletoPorId: vi.fn(),
    };

    useCase = new RechazarPago(mockVentaRepo, mockBoletosRepo);
  });

  it('debe rechazar la venta y cancelar los boletos cuando la venta es pendiente', async () => {
    const ventaPendiente = new Venta(1, 'Quito', 'Guayaquil', 25.0, EstadoVenta.PENDIENTE, MetodoPago.TRANSFERENCIA);
    ventaPendiente.id = 50;

    vi.mocked(mockVentaRepo.obtenerVentaPorId).mockResolvedValue(ventaPendiente);

    await useCase.ejecutar(50, 'oficinista-uuid-1', 'Comprobante ilegible');

    expect(mockVentaRepo.rechazarVenta).toHaveBeenCalledWith(50, 'oficinista-uuid-1', 'Comprobante ilegible');
    expect(mockBoletosRepo.actualizarEstadoPorVenta).toHaveBeenCalledWith(50, EstadoBoleto.CANCELADO);
  });

  it('debe lanzar error si no se pasa ventaId o aprobadoPorId', async () => {
    await expect(useCase.ejecutar(0, 'oficinista-1')).rejects.toThrow('Debe seleccionar una venta');
    await expect(useCase.ejecutar(50, '')).rejects.toThrow('No se encontró el usuario oficinista');
  });

  it('debe lanzar error si la venta no existe', async () => {
    vi.mocked(mockVentaRepo.obtenerVentaPorId).mockResolvedValue(null);

    await expect(useCase.ejecutar(99, 'oficinista-1')).rejects.toThrow('La venta no existe');
  });

  it('debe lanzar error si la venta no está en estado Pendiente', async () => {
    const ventaAprobada = new Venta(1, 'Quito', 'Guayaquil', 25.0, EstadoVenta.APROBADA_PAGO, MetodoPago.TRANSFERENCIA);
    ventaAprobada.id = 50;

    vi.mocked(mockVentaRepo.obtenerVentaPorId).mockResolvedValue(ventaAprobada);

    await expect(useCase.ejecutar(50, 'oficinista-1')).rejects.toThrow('Solo se pueden rechazar ventas pendientes');
  });
});
