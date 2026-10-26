/**
 * ObtenerDashboardResumen.ts - Caso de Uso para Consolidar Métricas y KPIs
 *
 * Transforma métricas de dominio en datos optimizados para el panel de control
 * según el rol del usuario conectado.
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
    const metricas = await this.dashboardRepo.obtenerMetricas();
    const rolActual = String(contexto.rol || RolUsuario.CLIENTE).toLowerCase();

    let tipoDashboard: TipoDashboard = 'cliente';
    let mensajeRol = `Bienvenido/a ${contexto.nombres || 'Usuario'}, consulta tus viajes y boletos`;
    const kpis: DashboardKpiDto[] = [];

    if (rolActual === RolUsuario.ADMIN) {
      tipoDashboard = 'admin';
      mensajeRol = 'Panel de Administración General de la Cooperativa';
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
          indicador: 'Flota habilitada para servicio',
          icono: 'bus',
        },
        {
          etiqueta: 'Rutas Programadas Hoy',
          valor: metricas.totalRutasHoy,
          indicador: 'Despachos del día',
          icono: 'map-pin',
        },
        {
          etiqueta: 'Ventas de Hoy',
          valor: `$${metricas.ventasDelDia.toFixed(2)}`,
          indicador: 'Ingresos brutos del sistema',
          icono: 'dollar-sign',
        },
        {
          etiqueta: 'Boletos Emitidos Hoy',
          valor: metricas.boletosEmitidosHoy,
          indicador: 'Tickets generados',
          icono: 'ticket',
        }
      );
    } else if (rolActual === RolUsuario.OFICINISTA) {
      tipoDashboard = 'cooperativa';
      mensajeRol = 'Módulo Operativo de Boletería y Ventas';
      kpis.push(
        {
          etiqueta: 'Ventas del Día',
          valor: `$${metricas.ventasDelDia.toFixed(2)}`,
          indicador: 'Recaudación de ventanilla',
          icono: 'dollar-sign',
        },
        {
          etiqueta: 'Boletos Emitidos',
          valor: metricas.boletosEmitidosHoy,
          indicador: 'Pasajes asignados',
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
          etiqueta: 'Viajes de Hoy',
          valor: metricas.totalRutasHoy,
          indicador: 'Frecuencias programadas',
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
          etiqueta: 'Rutas Activas Hoy',
          valor: metricas.totalRutasHoy,
          indicador: 'Disponibles para reserva',
          icono: 'compass',
        },
        {
          etiqueta: 'Buses Listos',
          valor: metricas.totalBusesActivos,
          indicador: 'Unidades con servicio',
          icono: 'check-circle',
        }
      );
    }

    return {
      tipo: tipoDashboard,
      mensajeRol,
      kpis,
      ventasSemana: [
        { etiqueta: 'Lun', valor: Math.round(metricas.ventasDelDia * 0.7) },
        { etiqueta: 'Mar', valor: Math.round(metricas.ventasDelDia * 0.8) },
        { etiqueta: 'Mie', valor: Math.round(metricas.ventasDelDia * 0.75) },
        { etiqueta: 'Jue', valor: Math.round(metricas.ventasDelDia * 0.9) },
        { etiqueta: 'Vie', valor: Math.round(metricas.ventasDelDia * 1.2) },
        { etiqueta: 'Sab', valor: Math.round(metricas.ventasDelDia * 1.4) },
        { etiqueta: 'Dom', valor: metricas.ventasDelDia },
      ],
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
