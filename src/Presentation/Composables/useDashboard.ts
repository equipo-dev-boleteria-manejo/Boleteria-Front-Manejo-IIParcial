/**
 * useDashboard.ts - Composable de Presentación para Métricas del Dashboard
 *
 * Arquitectura:
 * - Desacoplado de la UI.
 * - Consume ObtenerDashboardResumen UseCase.
 * - Provee estado reactivo para alimentar cualquier diseño de vista o gráfico.
 */

import { ref, computed } from 'vue';
import {
  ObtenerDashboardResumen,
  obtenerDashboardResumenUseCase as defaultDashboardUseCase,
} from '../../Application/UseCases/ObtenerDashboardResumen';
import type {
  DashboardContextoDto,
  DashboardResumenDto,
} from '../../Application/Dtos/DashboardResumenDto';
import { useAuthStore } from '../Store/authStore';

export function useDashboard(
  dashboardService: ObtenerDashboardResumen = defaultDashboardUseCase
) {
  const authStore = useAuthStore();

  const resumen = ref<DashboardResumenDto | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const contextoActual = computed<DashboardContextoDto>(() => ({
    usuarioId: authStore.user?.id || '',
    rol: authStore.user?.rol || 'cliente',
    nombres: authStore.user?.nombre || authStore.user?.nombres || '',
    cedula: authStore.user?.cedula || '',
    cooperativaId: authStore.user?.cooperativaId || null,
  }));

  const kpis = computed(() => resumen.value?.kpis ?? []);
  const metricasGenerales = computed(() => resumen.value?.metricasGenerales ?? null);
  const ventasSemana = computed(() => resumen.value?.ventasSemana ?? []);

  async function cargarDashboard(contextoPersonalizado?: DashboardContextoDto): Promise<void> {
    const contextoParaEjecutar = contextoPersonalizado || contextoActual.value;

    loading.value = true;
    error.value = null;

    try {
      resumen.value = await dashboardService.execute(contextoParaEjecutar);
    } catch (err: any) {
      error.value = err.message || 'No fue posible cargar las métricas del dashboard';
      resumen.value = null;
    } finally {
      loading.value = false;
    }
  }

  return {
    resumen,
    loading,
    error,
    kpis,
    metricasGenerales,
    ventasSemana,
    cargarDashboard,
    recargar: cargarDashboard,
  };
}
