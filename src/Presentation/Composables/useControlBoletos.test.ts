import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useControlBoletos } from './useControlBoletos';
import { AprobarPago } from '../../Application/UseCases/AprobarPago';
import { RechazarPago } from '../../Application/UseCases/RechazarPago';
import { VenderBoleto } from '../../Application/UseCases/VenderBoleto';
import type { IVentaRepository } from '../../Domain/Repositories/IVentaRepository';
import type { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository';
import { Venta } from '../../Domain/Entities/Venta';
import { Boleto } from '../../Domain/Entities/Boleto';
import { EstadoVenta } from '../../Domain/Constants/EstadosSistema';

describe('useControlBoletos Composable', () => {
  let mockAprobarUseCase: AprobarPago;
  let mockRechazarUseCase: RechazarPago;
  let mockVenderUseCase: VenderBoleto;
  let mockVentaRepo: IVentaRepository;
  let mockBoletosRepo: IBoletosRepository;

  beforeEach(() => {
    mockAprobarUseCase = {
      ejecutar: vi.fn().mockResolvedValue(undefined),
    } as unknown as AprobarPago;

    mockRechazarUseCase = {
      ejecutar: vi.fn().mockResolvedValue(undefined),
    } as unknown as RechazarPago;

    mockVenderUseCase = {
      ejecutar: vi.fn().mockResolvedValue({ ventaId: 10, total: 30, boletos: [] }),
    } as unknown as VenderBoleto;

    mockVentaRepo = {
      crearVenta: vi.fn(),
      cancelarVenta: vi.fn(),
      obtenerVentaPorId: vi.fn(),
      obtenerVentasPendientes: vi.fn().mockResolvedValue([]),
      obtenerVentasPorRuta: vi.fn(),
      aprobarVenta: vi.fn(),
      rechazarVenta: vi.fn(),
      migrarVentasARuta: vi.fn(),
    };

    mockBoletosRepo = {
      insertarBoletos: vi.fn(),
      actualizarEstadoPorVenta: vi.fn(),
      obtenerBoletosPorVenta: vi.fn().mockResolvedValue([]),
      obtenerBoletosPorRuta: vi.fn(),
      obtenerBoletosPorUsuario: vi.fn(),
      verificarAsientoDisponible: vi.fn().mockResolvedValue(true),
      obtenerAsientosDisponiblesPorRuta: vi.fn(),
      obtenerAsientosOcupadosPorRuta: vi.fn(),
      obtenerBoletoPorId: vi.fn(),
    };
  });

  it('debe iniciar con estado por defecto', () => {
    const composable = useControlBoletos(
      mockAprobarUseCase,
      mockRechazarUseCase,
      mockVenderUseCase,
      mockVentaRepo,
      mockBoletosRepo
    );

    expect(composable.loading.value).toBe(false);
    expect(composable.error.value).toBeNull();
    expect(composable.ventasPendientes.value).toEqual([]);
    expect(composable.boletosVenta.value).toEqual([]);
    expect(composable.totalPendientes.value).toBe(0);
    expect(composable.tienePendientes.value).toBe(false);
  });

  it('debe cargar ventas pendientes y actualizar totalPendientes y tienePendientes', async () => {
    const v1 = new Venta(1, 'Quito', 'Guayaquil', 20, EstadoVenta.PENDIENTE);
    v1.id = 1;
    const v2 = new Venta(1, 'Quito', 'Guayaquil', 15, EstadoVenta.PENDIENTE);
    v2.id = 2;

    vi.mocked(mockVentaRepo.obtenerVentasPendientes).mockResolvedValue([v1, v2]);

    const composable = useControlBoletos(
      mockAprobarUseCase,
      mockRechazarUseCase,
      mockVenderUseCase,
      mockVentaRepo,
      mockBoletosRepo
    );

    await composable.cargarVentasPendientes();

    expect(composable.ventasPendientes.value).toHaveLength(2);
    expect(composable.totalPendientes.value).toBe(2);
    expect(composable.tienePendientes.value).toBe(true);
  });

  it('debe cargar boletos de una venta', async () => {
    const b1 = new Boleto(1, 1, 1, '1710000009', 'Juan', 'Perez', 20);
    vi.mocked(mockBoletosRepo.obtenerBoletosPorVenta).mockResolvedValue([b1]);

    const composable = useControlBoletos(
      mockAprobarUseCase,
      mockRechazarUseCase,
      mockVenderUseCase,
      mockVentaRepo,
      mockBoletosRepo
    );

    await composable.cargarBoletosVenta(1);

    expect(composable.boletosVenta.value).toHaveLength(1);
  });

  it('debe aprobar pago y remover la venta de la lista reactiva de pendientes', async () => {
    const v1 = new Venta(1, 'Quito', 'Guayaquil', 20, EstadoVenta.PENDIENTE);
    v1.id = 10;
    vi.mocked(mockVentaRepo.obtenerVentasPendientes).mockResolvedValue([v1]);

    const composable = useControlBoletos(
      mockAprobarUseCase,
      mockRechazarUseCase,
      mockVenderUseCase,
      mockVentaRepo,
      mockBoletosRepo
    );

    await composable.cargarVentasPendientes();
    expect(composable.ventasPendientes.value).toHaveLength(1);

    await composable.aprobarPago(10, 'oficinista-1');

    expect(mockAprobarUseCase.ejecutar).toHaveBeenCalledWith(10, 'oficinista-1');
    expect(composable.ventasPendientes.value).toHaveLength(0);
  });

  it('debe rechazar pago con observación y remover de pendientes', async () => {
    const v1 = new Venta(1, 'Quito', 'Guayaquil', 20, EstadoVenta.PENDIENTE);
    v1.id = 20;
    vi.mocked(mockVentaRepo.obtenerVentasPendientes).mockResolvedValue([v1]);

    const composable = useControlBoletos(
      mockAprobarUseCase,
      mockRechazarUseCase,
      mockVenderUseCase,
      mockVentaRepo,
      mockBoletosRepo
    );

    await composable.cargarVentasPendientes();
    await composable.rechazarPago(20, 'oficinista-1', 'Recibo ilegible');

    expect(mockRechazarUseCase.ejecutar).toHaveBeenCalledWith(20, 'oficinista-1', 'Recibo ilegible');
    expect(composable.ventasPendientes.value).toHaveLength(0);
  });

  it('debe ejecutar venta en ventanilla y retornar resultado', async () => {
    const composable = useControlBoletos(
      mockAprobarUseCase,
      mockRechazarUseCase,
      mockVenderUseCase,
      mockVentaRepo,
      mockBoletosRepo
    );

    const input: any = { usuarioVendedorId: 'of-1', ruta: { id: 1 } };
    const res = await composable.venderEnVentanilla(input);

    expect(mockVenderUseCase.ejecutar).toHaveBeenCalledWith(input);
    expect(res.ventaId).toBe(10);
  });

  it('debe verificar disponibilidad de asiento', async () => {
    const composable = useControlBoletos(
      mockAprobarUseCase,
      mockRechazarUseCase,
      mockVenderUseCase,
      mockVentaRepo,
      mockBoletosRepo
    );

    const disp = await composable.verificarDisponibilidadAsiento(1, 5);
    expect(disp).toBe(true);
    expect(mockBoletosRepo.verificarAsientoDisponible).toHaveBeenCalledWith(1, 5);
  });
});
