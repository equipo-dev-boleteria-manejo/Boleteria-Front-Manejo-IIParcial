/**
 * useDashboard.ts - Composable de Presentación para Métricas del Dashboard
 *
 * Arquitectura:
 * - Desacoplado de la UI.
 * - Consume ObtenerDashboardResumen UseCase.
 * - Control de filtros de fecha y reactividad para alimentar gráficos de Chart.js.
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

  // Filtro de fechas reactivo
  const fechaInicio = ref('');
  const fechaFin = ref('');
  const periodoSeleccionado = ref<'hoy' | 'semana' | 'mes' | 'personalizado'>('semana');

  const contextoActual = computed<DashboardContextoDto>(() => {
    let fi = fechaInicio.value;
    let ff = fechaFin.value;

    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];

    if (periodoSeleccionado.value === 'hoy') {
      fi = hoyStr;
      ff = hoyStr;
    } else if (periodoSeleccionado.value === 'semana') {
      const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      fi = hace7Dias.toISOString().split('T')[0];
      ff = hoyStr;
    } else if (periodoSeleccionado.value === 'mes') {
      const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      fi = hace30Dias.toISOString().split('T')[0];
      ff = hoyStr;
    }

    return {
      usuarioId: authStore.user?.id || '',
      rol: authStore.user?.rol || 'cliente',
      nombres: authStore.user?.nombre || authStore.user?.nombres || '',
      cedula: authStore.user?.cedula || '',
      cooperativaId: authStore.user?.cooperativaId || null,
      filtroFecha: fi && ff ? { fechaInicio: fi, fechaFin: ff } : undefined,
    };
  });

  const kpis = computed(() => resumen.value?.kpis ?? []);
  const metricasGenerales = computed(() => resumen.value?.metricasGenerales ?? null);
  const ventasSemana = computed(() => resumen.value?.ventasSemana ?? []);
  const estadoFlota = computed(() => resumen.value?.estadoFlota ?? { activos: 0, mantenimiento: 0, inactivos: 0 });
  const metodosPago = computed(() => resumen.value?.metodosPago ?? []);
  const topRutas = computed(() => resumen.value?.topRutas ?? []);

  async function cargarDashboard(contextoPersonalizado?: DashboardContextoDto): Promise<void> {
    const contextoParaEjecutar = contextoPersonalizado || contextoActual.value;

    loading.value = true;
    error.value = null;

    try {
      resumen.value = await dashboardService.execute(contextoParaEjecutar);
    } catch (err: any) {
      error.value = err?.message || 'Error inesperado al cargar las métricas operativas';
    } finally {
      loading.value = false;
    }
  }

  function cambiarPeriodo(periodo: 'hoy' | 'semana' | 'mes' | 'personalizado') {
    periodoSeleccionado.value = periodo;
    if (periodo !== 'personalizado') {
      cargarDashboard();
    }
  }

  return {
    resumen,
    loading,
    error,
    kpis,
    metricasGenerales,
    ventasSemana,
    estadoFlota,
    metodosPago,
    topRutas,
    fechaInicio,
    fechaFin,
    periodoSeleccionado,
    cambiarPeriodo,
    cargarDashboard,
  };
}
