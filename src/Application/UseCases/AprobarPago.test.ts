import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AprobarPago } from './AprobarPago';
import type { IVentaRepository } from '../../Domain/Repositories/IVentaRepository';
import type { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository';
import { Venta } from '../../Domain/Entities/Venta';
import { Boleto } from '../../Domain/Entities/Boleto';
import { EstadoVenta, EstadoBoleto, MetodoPago } from '../../Domain/Constants/EstadosSistema';

describe('AprobarPago (Caso de Uso)', () => {
  let mockVentaRepo: IVentaRepository;
  let mockBoletosRepo: IBoletosRepository;
  let useCase: AprobarPago;

  beforeEach(() => {
    mockVentaRepo = {
      crearVenta: vi.fn(),
      cancelarVenta: vi.fn(),
      obtenerVentaPorId: vi.fn(),
      obtenerVentasPendientes: vi.fn(),
      obtenerVentasPorRuta: vi.fn(),
      aprobarVenta: vi.fn().mockResolvedValue(undefined),
      rechazarVenta: vi.fn(),
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

    useCase = new AprobarPago(mockVentaRepo, mockBoletosRepo);
  });

  it('debe aprobar la venta y emitir los boletos cuando la venta es válida y pendiente', async () => {
    const ventaPendiente = new Venta(1, 'Quito', 'Guayaquil', 25.0, EstadoVenta.PENDIENTE, MetodoPago.TRANSFERENCIA);
    ventaPendiente.id = 50;
    ventaPendiente.comprobanteUrl = 'https://cdn.example.com/recibo.png';

    const boletos = [new Boleto(50, 1, 10, '1710000009', 'Juan', 'Perez', 25.0)];

    vi.mocked(mockVentaRepo.obtenerVentaPorId).mockResolvedValue(ventaPendiente);
    vi.mocked(mockBoletosRepo.obtenerBoletosPorVenta).mockResolvedValue(boletos);

    await useCase.ejecutar(50, 'oficinista-uuid-1');

    expect(mockVentaRepo.aprobarVenta).toHaveBeenCalledWith(50, 'oficinista-uuid-1');
    expect(mockBoletosRepo.actualizarEstadoPorVenta).toHaveBeenCalledWith(50, EstadoBoleto.EMITIDO);
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
    const ventaCancelada = new Venta(1, 'Quito', 'Guayaquil', 25.0, EstadoVenta.CANCELADA, MetodoPago.TRANSFERENCIA);
    ventaCancelada.id = 50;
    ventaCancelada.comprobanteUrl = 'https://cdn.example.com/recibo.png';

    vi.mocked(mockVentaRepo.obtenerVentaPorId).mockResolvedValue(ventaCancelada);

    await expect(useCase.ejecutar(50, 'oficinista-1')).rejects.toThrow('Solo se pueden aprobar ventas pendientes');
  });

  it('debe lanzar error si la venta no tiene comprobante adjunto', async () => {
    const ventaSinComprobante = new Venta(1, 'Quito', 'Guayaquil', 25.0, EstadoVenta.PENDIENTE, MetodoPago.TRANSFERENCIA);
    ventaSinComprobante.id = 50;
    ventaSinComprobante.comprobanteUrl = null;

    vi.mocked(mockVentaRepo.obtenerVentaPorId).mockResolvedValue(ventaSinComprobante);

    await expect(useCase.ejecutar(50, 'oficinista-1')).rejects.toThrow('No se puede aprobar una venta sin comprobante');
  });

  it('debe lanzar error si no existen boletos asociados a la venta', async () => {
    const ventaPendiente = new Venta(1, 'Quito', 'Guayaquil', 25.0, EstadoVenta.PENDIENTE, MetodoPago.TRANSFERENCIA);
    ventaPendiente.id = 50;
    ventaPendiente.comprobanteUrl = 'https://cdn.example.com/recibo.png';

    vi.mocked(mockVentaRepo.obtenerVentaPorId).mockResolvedValue(ventaPendiente);
    vi.mocked(mockBoletosRepo.obtenerBoletosPorVenta).mockResolvedValue([]);

    await expect(useCase.ejecutar(50, 'oficinista-1')).rejects.toThrow('No se puede aprobar una venta sin boletos asociados');
  });
});
