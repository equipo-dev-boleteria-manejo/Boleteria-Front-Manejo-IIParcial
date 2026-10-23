/**
 * DashboardResumenDto.ts - DTO consolidado para métricas y KPIs del Dashboard
 */

import { RolUsuario } from '../../Domain/Constants/EstadosSistema';

export type TipoDashboard = 'cliente' | 'cooperativa' | 'chofer' | 'admin';

export interface DashboardContextoDto {
  usuarioId: string;
  rol: RolUsuario | string;
  nombres?: string | null;
  cedula?: string | null;
  cooperativaId?: number | null;
}

export interface DashboardKpiDto {
  etiqueta: string;
  valor: string | number;
  indicador?: string;
  icono: string;
  tendencia?: number;
}

export interface DashboardGraficoPuntoDto {
  etiqueta: string;
  valor: number;
}

export interface DashboardResumenDto {
  tipo: TipoDashboard;
  mensajeRol: string;
  kpis: DashboardKpiDto[];
  ventasSemana: DashboardGraficoPuntoDto[];
  metricasGenerales: {
    totalUsuarios: number;
    totalBusesActivos: number;
    totalRutasHoy: number;
    ventasDelDia: number;
    boletosEmitidosHoy: number;
  };
}
