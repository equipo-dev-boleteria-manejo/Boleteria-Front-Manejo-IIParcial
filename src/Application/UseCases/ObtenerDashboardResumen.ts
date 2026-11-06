/**
 * ObtenerDashboardResumen.ts - Caso de Uso para Consolidar Métricas y KPIs
 *
 * Transforma métricas de dominio en datos analíticos optimizados para el panel de control
 * según el rol del usuario conectado y soporta filtros de fecha.
 */

import type { IDashboardRepository } from '../../Domain/Repositories/IDashboardRepository';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';
import { SupabaseDashboardRepository } from '../../Infrastructure/Repositories/SupabaseDashboardRepository';
import type {
  DashboardContextoDto,
  DashboardResumenDto,
  DashboardKpiDto,
  TipoDashboard,
} from '../Dtos/DashboardResumenDto';

export class ObtenerDashboardResumen {
  constructor(private readonly dashboardRepo: IDashboardRepository) {}

  async execute(contexto: DashboardContextoDto): Promise<DashboardResumenDto> {
    let metricas;
    let dataAvanzada;

    if (typeof this.dashboardRepo.obtenerEstadisticasAvanzadas === 'function') {
      dataAvanzada = await this.dashboardRepo.obtenerEstadisticasAvanzadas(contexto.filtroFecha);
      metricas = dataAvanzada.metricas;
    } else {
      metricas = await this.dashboardRepo.obtenerMetricas(contexto.filtroFecha);
      dataAvanzada = {
        metricas,
        ventasPorDia: [],
        metodosPago: [],
        topRutas: [],
        estadoFlota: { activos: metricas.totalBusesActivos, mantenimiento: 0, inactivos: 0 },
      };
    }
    const rolActual = String(contexto.rol || RolUsuario.CLIENTE).toLowerCase();

    let tipoDashboard: TipoDashboard = 'cliente';
    let mensajeRol = `Bienvenido/a ${contexto.nombres || 'Usuario'}, consulta tus viajes y boletos`;
    const kpis: DashboardKpiDto[] = [];

    if (rolActual === RolUsuario.ADMIN) {
      tipoDashboard = 'admin';
      mensajeRol = 'Panel de Control y Analítica de Flota (Geotab Analytics)';
      kpis.push(
        {
          etiqueta: 'Usuarios Totales',
          valor: metricas.totalUsuarios,
          indicador: 'Cuentas activas en plataforma',
          icono: 'users',
        },
        {
          etiqueta: 'Buses Operativos',
          valor: metricas.totalBusesActivos,
          indicador: `${dataAvanzada.estadoFlota.activos} en ruta, ${dataAvanzada.estadoFlota.mantenimiento} en taller`,
          icono: 'bus',
        },
        {
          etiqueta: 'Rutas Programadas',
          valor: metricas.totalRutasHoy,
          indicador: 'Despachos en el período',
          icono: 'map-pin',
        },
        {
          etiqueta: 'Ventas del Período',
          valor: `$${metricas.ventasDelDia.toFixed(2)}`,
          indicador: `${metricas.boletosEmitidosHoy} boletos emitidos`,
          icono: 'dollar-sign',
        }
      );
    } else if (rolActual === RolUsuario.OFICINISTA) {
      tipoDashboard = 'cooperativa';
      mensajeRol = 'Módulo Operativo de Boletería y Ventas';
      kpis.push(
        {
          etiqueta: 'Ventas en Ventanilla',
          valor: `$${metricas.ventasDelDia.toFixed(2)}`,
          indicador: 'Recaudación del período',
          icono: 'dollar-sign',
        },
        {
          etiqueta: 'Boletos Emitidos',
          valor: metricas.boletosEmitidosHoy,
          indicador: 'Tickets procesados',
          icono: 'ticket',
        },
        {
          etiqueta: 'Rutas Disponibles',
          valor: metricas.totalRutasHoy,
          indicador: 'Viajes habilitados',
          icono: 'clock',
        }
      );
    } else if (rolActual === RolUsuario.CHOFER) {
      tipoDashboard = 'chofer';
      mensajeRol = 'Panel de Turnos y Hojas de Ruta del Conductor';
      kpis.push(
        {
          etiqueta: 'Viajes Programados',
          valor: metricas.totalRutasHoy,
          indicador: 'Frecuencias asignadas',
          icono: 'navigation',
        },
        {
          etiqueta: 'Buses en Servicio',
          valor: metricas.totalBusesActivos,
          indicador: 'Unidades rodando',
          icono: 'truck',
        }
      );
    } else {
      tipoDashboard = 'cliente';
      kpis.push(
        {
          etiqueta: 'Rutas Disponibles',
          valor: metricas.totalRutasHoy,
          indicador: 'Listas para reserva',
          icono: 'compass',
        },
        {
          etiqueta: 'Buses Operativos',
          valor: metricas.totalBusesActivos,
          indicador: 'Unidades con servicio',
          icono: 'check-circle',
        }
      );
    }

    const ventasSemana = dataAvanzada.ventasPorDia.map((d) => ({
      etiqueta: d.etiqueta.slice(-5), // MM-DD
      valor: d.totalVentas,
    }));

    return {
      tipo: tipoDashboard,
      mensajeRol,
      kpis,
      ventasSemana,
      ventasDetalladas: dataAvanzada.ventasPorDia,
      metodosPago: dataAvanzada.metodosPago,
      topRutas: dataAvanzada.topRutas,
      estadoFlota: dataAvanzada.estadoFlota,
      metricasGenerales: metricas,
    };
  }

  async ejecutar(contexto: DashboardContextoDto): Promise<DashboardResumenDto> {
    return this.execute(contexto);
  }
}

export const obtenerDashboardResumenUseCase = new ObtenerDashboardResumen(
  new SupabaseDashboardRepository()
);
