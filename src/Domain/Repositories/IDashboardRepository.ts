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

export interface FiltroFechaDashboard {
  fechaInicio?: string; // YYYY-MM-DD
  fechaFin?: string;    // YYYY-MM-DD
}

export interface SerieVentaFecha {
  etiqueta: string;
  totalVentas: number;
  boletos: number;
}

export interface DistribucionMetodoPago {
  metodo: string;
  cantidad: number;
  total: number;
}

export interface DesempenoRutaTop {
  ruta: string;
  viajes: number;
  boletos: number;
}

export interface EstadisticasDashboardAvanzadas {
  metricas: MetricasDashboard;
  ventasPorDia: SerieVentaFecha[];
  metodosPago: DistribucionMetodoPago[];
  topRutas: DesempenoRutaTop[];
  estadoFlota: {
    activos: number;
    mantenimiento: number;
    inactivos: number;
  };
}

export interface IDashboardRepository {
  obtenerMetricas(filtro?: FiltroFechaDashboard): Promise<MetricasDashboard>;
  obtenerEstadisticasAvanzadas(filtro?: FiltroFechaDashboard): Promise<EstadisticasDashboardAvanzadas>;
}
