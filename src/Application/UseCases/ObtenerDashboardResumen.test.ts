import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObtenerDashboardResumen } from './ObtenerDashboardResumen';
import type {
  IDashboardRepository,
  MetricasDashboard,
} from '../../Domain/Repositories/IDashboardRepository';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';

describe('ObtenerDashboardResumen UseCase', () => {
  let mockDashboardRepo: IDashboardRepository;
  let useCase: ObtenerDashboardResumen;
  let metricasFalsas: MetricasDashboard;

  beforeEach(() => {
    metricasFalsas = {
      totalUsuarios: 150,
      totalBusesActivos: 25,
      totalRutasHoy: 12,
      ventasDelDia: 450.5,
      boletosEmitidosHoy: 90,
    };

    mockDashboardRepo = {
      obtenerMetricas: vi.fn().mockResolvedValue(metricasFalsas),
    };

    useCase = new ObtenerDashboardResumen(mockDashboardRepo);
  });

  it('debe estructurar KPIs completos para un usuario Administrador', async () => {
    const contexto = {
      usuarioId: 'usr-admin-1',
      rol: RolUsuario.ADMIN,
      nombres: 'Administrador Demo',
    };

    const resumen = await useCase.execute(contexto);

    expect(resumen.tipo).toBe('admin');
    expect(resumen.kpis.length).toBeGreaterThanOrEqual(4);
    expect(resumen.metricasGenerales).toEqual(metricasFalsas);
    expect(mockDashboardRepo.obtenerMetricas).toHaveBeenCalledTimes(1);
  });

  it('debe estructurar KPIs de ventanilla para un Oficinista', async () => {
    const contexto = {
      usuarioId: 'usr-oficina-1',
      rol: RolUsuario.OFICINISTA,
      nombres: 'Oficinista Demo',
    };

    const resumen = await useCase.execute(contexto);

    expect(resumen.tipo).toBe('cooperativa');
    expect(resumen.kpis.some((kpi) => kpi.etiqueta.includes('Ventas'))).toBe(true);
  });

  it('debe estructurar KPIs de viajes para un Chofer', async () => {
    const contexto = {
      usuarioId: 'usr-chofer-1',
      rol: RolUsuario.CHOFER,
      nombres: 'Chofer Demo',
    };

    const resumen = await useCase.execute(contexto);

    expect(resumen.tipo).toBe('chofer');
  });

  it('debe generar vista amigable para un Cliente', async () => {
    const contexto = {
      usuarioId: 'usr-cliente-1',
      rol: RolUsuario.CLIENTE,
      nombres: 'Cliente Demo',
    };

    const resumen = await useCase.execute(contexto);

    expect(resumen.tipo).toBe('cliente');
  });
});
