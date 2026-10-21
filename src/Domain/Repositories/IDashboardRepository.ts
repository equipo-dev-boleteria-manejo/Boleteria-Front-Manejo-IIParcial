/**
 * IDashboardRepository.ts - Contrato de Dominio para Métricas Consolidadas del Sistema
 */

export interface MetricasDashboard {
  totalUsuarios: number;
  totalBusesActivos: number;
  totalRutasHoy: number;
  ventasDelDia: number;
  boletosEmitidosHoy: number;
}

export interface IDashboardRepository {
  obtenerMetricas(): Promise<MetricasDashboard>;
}
