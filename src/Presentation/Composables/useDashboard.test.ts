import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDashboard } from './useDashboard';
import { ObtenerDashboardResumen } from '../../Application/UseCases/ObtenerDashboardResumen';
import type { DashboardResumenDto } from '../../Application/Dtos/DashboardResumenDto';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';

describe('useDashboard Composable', () => {
  let mockDashboardService: ObtenerDashboardResumen;
  let resumenMock: DashboardResumenDto;

  beforeEach(() => {
    setActivePinia(createPinia());

    resumenMock = {
      tipo: 'admin',
      mensajeRol: 'Panel Admin',
      kpis: [{ etiqueta: 'Usuarios', valor: 100, icono: 'users' }],
      ventasSemana: [{ etiqueta: 'Lun', valor: 200 }],
      metricasGenerales: {
        totalUsuarios: 100,
        totalBusesActivos: 10,
        totalRutasHoy: 5,
        ventasDelDia: 350,
        boletosEmitidosHoy: 50,
      },
    };

    mockDashboardService = {
      execute: vi.fn().mockResolvedValue(resumenMock),
      ejecutar: vi.fn(),
    } as unknown as ObtenerDashboardResumen;
  });

  it('debe inicializar con estado limpio y cargar métricas correctamente', async () => {
    const { resumen, loading, error, cargarDashboard, kpis } = useDashboard(mockDashboardService);

    expect(loading.value).toBe(false);
    expect(resumen.value).toBeNull();
    expect(error.value).toBeNull();

    await cargarDashboard({
      usuarioId: 'usr-1',
      rol: RolUsuario.ADMIN,
    });

    expect(loading.value).toBe(false);
    expect(resumen.value).toEqual(resumenMock);
    expect(kpis.value).toHaveLength(1);
    expect(mockDashboardService.execute).toHaveBeenCalledTimes(1);
  });

  it('debe capturar errores si la carga del dashboard falla', async () => {
    mockDashboardService.execute = vi.fn().mockRejectedValue(new Error('Fallo de red'));
    const { resumen, error, cargarDashboard } = useDashboard(mockDashboardService);

    await cargarDashboard();

    expect(resumen.value).toBeNull();
    expect(error.value).toBe('Fallo de red');
  });
});
