<template>
  <div class="space-y-4 max-w-7xl mx-auto font-sans">
    <!-- Barra Superior de Filtros y Rango de Fechas (Estilo MyGeotab Analytics) -->
    <section class="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
      <div class="flex items-center gap-2.5 w-full md:w-auto">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-black text-sm">
          📊
        </div>
        <div>
          <h1 class="text-sm font-black text-slate-900 tracking-tight leading-tight">
            Panel de Control y Analítica
          </h1>
          <p class="text-[11px] text-slate-500 font-medium">
            Métricas operativas en tiempo real para {{ rolEtiqueta }}
          </p>
        </div>
      </div>

      <!-- Controles de Período y Rango de Fechas -->
      <div class="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
        <div class="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
          <button
            type="button"
            @click="cambiarPeriodo('hoy')"
            class="px-3 py-1 rounded-lg transition-all cursor-pointer"
            :class="periodoSeleccionado === 'hoy' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
          >
            Hoy
          </button>
          <button
            type="button"
            @click="cambiarPeriodo('semana')"
            class="px-3 py-1 rounded-lg transition-all cursor-pointer"
            :class="periodoSeleccionado === 'semana' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
          >
            7 Días
          </button>
          <button
            type="button"
            @click="cambiarPeriodo('mes')"
            class="px-3 py-1 rounded-lg transition-all cursor-pointer"
            :class="periodoSeleccionado === 'mes' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
          >
            30 Días
          </button>
          <button
            type="button"
            @click="cambiarPeriodo('personalizado')"
            class="px-3 py-1 rounded-lg transition-all cursor-pointer"
            :class="periodoSeleccionado === 'personalizado' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
          >
            Personalizado
          </button>
        </div>

        <!-- Inputs de fecha si se elige personalizado -->
        <div v-if="periodoSeleccionado === 'personalizado'" class="flex items-center gap-1.5">
          <input
            v-model="fechaInicio"
            type="date"
            class="rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium"
          />
          <span class="text-xs text-slate-400">a</span>
          <input
            v-model="fechaFin"
            type="date"
            class="rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium"
          />
          <button
            type="button"
            @click="cargarDashboard()"
            class="rounded-xl bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
          >
            Filtrar
          </button>
        </div>

        <button
          type="button"
          :disabled="loading"
          @click="cargarDashboard()"
          class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          title="Actualizar datos"
        >
          <svg class="h-3.5 w-3.5 text-slate-500" :class="loading ? 'animate-spin' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span class="hidden sm:inline">Actualizar</span>
        </button>
      </div>
    </section>

    <!-- Estado 1: CARGANDO (Skeleton Loader) -->
    <section v-if="loading" class="rounded-2xl bg-white p-8 shadow-xs border border-slate-200 animate-pulse space-y-6" aria-busy="true">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div v-for="i in 4" :key="i" class="h-24 rounded-2xl bg-slate-100 p-4 space-y-2">
          <div class="h-3 w-20 bg-slate-200 rounded"></div>
          <div class="h-7 w-28 bg-slate-300 rounded"></div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="h-64 rounded-2xl bg-slate-100 col-span-2"></div>
        <div class="h-64 rounded-2xl bg-slate-100"></div>
      </div>
    </section>

    <!-- Estado 2: ERROR -->
    <section v-else-if="error" class="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-rose-800 shadow-xs" role="alert">
      <div class="flex items-start gap-3">
        <span class="text-2xl">⚠️</span>
        <div class="space-y-1">
          <h2 class="text-sm font-black text-rose-900">No se pudieron cargar las métricas</h2>
          <p class="text-xs text-rose-700">{{ error }}</p>
          <div class="pt-2">
            <button
              type="button"
              @click="cargarDashboard()"
              class="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-xs hover:bg-rose-700 cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Estado 3: CONTENIDO ANALÍTICO -->
    <template v-else>
      <!-- Grid de KPIs Generales (Estilo MyGeotab Metric Cards: 4 en una sola línea en desktop) -->
      <section v-if="kpis && kpis.length > 0" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <article
          v-for="(kpi, idx) in kpis"
          :key="kpi.etiqueta"
          class="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {{ kpi.etiqueta }}
              </p>
              <p class="mt-1.5 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {{ kpi.valor }}
              </p>
            </div>
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-2xs"
              :class="getIconBadgeClass(idx)"
            >
              {{ getIconEmoji(kpi.icono) }}
            </div>
          </div>
          <p v-if="kpi.indicador" class="mt-2.5 text-[11px] font-semibold text-slate-400 border-t border-slate-100 pt-2 flex items-center gap-1">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span>{{ kpi.indicador }}</span>
          </p>
        </article>
      </section>

      <!-- Panel de Gráficos Analíticos (Estilo MyGeotab Dashboard) -->
      <section class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Gráfico 1: Tendencia de Ventas e Ingresos (Bar/Line Chart) -->
        <article class="lg:col-span-2 rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 class="text-sm font-black text-slate-900 uppercase tracking-wide">
                Ingresos y Recaudación
              </h2>
              <p class="text-[11px] text-slate-400 font-medium">
                Tendencia en el período seleccionado
              </p>
            </div>
            <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
              Ventas ($)
            </span>
          </div>

              <div class="h-64 pt-4 relative">
                <Bar v-if="tieneDatosVentas" :data="ventasBarChartData" :options="ventasChartOptions" />
                <div
                  v-else
                  class="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50"
                >
                  <span class="text-3xl mb-2">📊</span>
                  <p class="text-xs font-bold text-slate-700">Sin transacciones registradas</p>
                  <p class="text-[11px] text-slate-400 mt-1 max-w-xs">
                    No hay ventas en la base de datos para el período seleccionado.
                  </p>
                </div>
              </div>
            </article>

            <!-- Gráfico 2: Cuadro de Mando de Estado de Flota (Doughnut Chart) -->
            <article class="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 class="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Disponibilidad de Flota
                  </h2>
                  <p class="text-[11px] text-slate-400 font-medium">
                    Distribución operativa de buses
                  </p>
                </div>
                <span class="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  {{ totalBuses }} Unidades
                </span>
              </div>

              <div class="h-56 pt-2 relative flex items-center justify-center">
                <Doughnut v-if="totalBuses > 0" :data="flotaDoughnutData" :options="doughnutOptions" />
                <div
                  v-else
                  class="h-full w-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50"
                >
                  <span class="text-3xl mb-2">🚌</span>
                  <p class="text-xs font-bold text-slate-700">Sin unidades registradas</p>
                  <p class="text-[11px] text-slate-400 mt-1">
                    No existen buses activos o en mantenimiento en la base de datos.
                  </p>
                </div>
              </div>

              <div class="flex items-center justify-around text-center pt-2 border-t border-slate-100 text-[11px]">
                <div>
                  <span class="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1"></span>
                  <span class="font-bold text-slate-700">Activos: {{ estadoFlota.activos }}</span>
                </div>
                <div>
                  <span class="inline-block h-2 w-2 rounded-full bg-amber-500 mr-1"></span>
                  <span class="font-bold text-slate-700">Mantenimiento: {{ estadoFlota.mantenimiento }}</span>
                </div>
                <div>
                  <span class="inline-block h-2 w-2 rounded-full bg-slate-400 mr-1"></span>
                  <span class="font-bold text-slate-700">Inactivos: {{ estadoFlota.inactivos }}</span>
                </div>
              </div>
            </article>
          </section>

          <!-- Fila 2 de Gráficos: Métodos de Pago y Desempeño Operativo -->
          <section class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- Gráfico 3: Participación por Método de Pago (Horizontal Bar / Pie) -->
            <article class="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 class="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Canales de Pago
                  </h2>
                  <p class="text-[11px] text-slate-400 font-medium">
                    Distribución de compras por método
                  </p>
                </div>
                <span class="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  Pasarela & Ventanilla
                </span>
              </div>

              <div class="h-56 pt-3 relative">
                <Bar v-if="tieneDatosMetodosPago" :data="metodosPagoChartData" :options="horizontalBarOptions" />
                <div
                  v-else
                  class="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50"
                >
                  <span class="text-3xl mb-2">💳</span>
                  <p class="text-xs font-bold text-slate-700">Sin métodos de pago usados</p>
                  <p class="text-[11px] text-slate-400 mt-1">
                    No hay registros de transacciones para evaluar canales de pago.
                  </p>
                </div>
              </div>
            </article>

            <!-- Tabla de Rutas de Mayor Tránsito (Estilo Geotab Top Conductores/Rutas) -->
            <article class="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 class="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Rutas de Mayor Demanda
                  </h2>
                  <p class="text-[11px] text-slate-400 font-medium">
                    Despachos y frecuencia de pasajeros
                  </p>
                </div>
                <span class="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Interprovincial
                </span>
              </div>

              <div class="overflow-x-auto pt-2">
                <table v-if="topRutas.length > 0" class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="text-slate-400 font-bold border-b border-slate-100 uppercase text-[10px]">
                      <th class="py-2">Ruta / Corredor</th>
                      <th class="py-2 text-center">Frecuencias</th>
                      <th class="py-2 text-right">Boletos</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-50 text-slate-700 font-medium">
                    <tr v-for="r in topRutas" :key="r.ruta" class="hover:bg-slate-50 transition-colors">
                      <td class="py-2.5 font-bold text-slate-900 flex items-center gap-2">
                        <span class="h-2 w-2 rounded-full bg-blue-600"></span>
                        <span>{{ r.ruta }}</span>
                      </td>
                      <td class="py-2.5 text-center">
                        <span class="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                          {{ r.viajes }} viajes
                        </span>
                      </td>
                      <td class="py-2.5 text-right font-bold text-emerald-700">
                        {{ r.boletos }} pasajes
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div
                  v-else
                  class="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50"
                >
                  <span class="text-3xl mb-2">📍</span>
                  <p class="text-xs font-bold text-slate-700">Sin rutas con tráfico</p>
                  <p class="text-[11px] text-slate-400 mt-1">
                    No se han registrado itinerarios o rutas con salidas activas en el período.
                  </p>
                </div>
              </div>
            </article>
          </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useDashboard } from '../Composables/useDashboard'
import { useAuthStore } from '../Store/authStore'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement
)

const authStore = useAuthStore()
const {
  resumen,
  loading,
  error,
  kpis,
  ventasSemana,
  estadoFlota,
  metodosPago,
  topRutas,
  fechaInicio,
  fechaFin,
  periodoSeleccionado,
  cambiarPeriodo,
  cargarDashboard,
} = useDashboard()

onMounted(() => {
  cargarDashboard()
})

const rolEtiqueta = computed(() => {
  const r = (authStore.user?.rol || 'cliente').toUpperCase()
  return r
})

const totalBuses = computed(() => {
  return (estadoFlota.value.activos || 0) + (estadoFlota.value.mantenimiento || 0) + (estadoFlota.value.inactivos || 0)
})

const tieneDatosVentas = computed(() => {
  return (ventasSemana.value || []).length > 0 && (ventasSemana.value || []).some((v) => v.valor > 0)
})

const tieneDatosMetodosPago = computed(() => {
  return (metodosPago.value || []).length > 0 && (metodosPago.value || []).some((m) => (m.total || m.cantidad) > 0)
})

// Gráfico de Barras: Ventas
const ventasBarChartData = computed(() => {
  const etiquetas = (ventasSemana.value || []).map((v) => v.etiqueta)
  const valores = (ventasSemana.value || []).map((v) => v.valor)

  return {
    labels: etiquetas,
    datasets: [
      {
        label: 'Ingresos ($)',
        backgroundColor: '#2563eb',
        borderRadius: 8,
        data: valores,
      },
    ],
  }
})

const ventasChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0f172a',
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      grid: { color: '#f1f5f9' },
      ticks: {
        callback: (val: any) => `$${val}`,
      },
    },
  },
}

// Gráfico Doughnut: Estado de Flota
const flotaDoughnutData = computed(() => {
  const f = estadoFlota.value
  const data = [f.activos || 0, f.mantenimiento || 0, f.inactivos || 0]

  return {
    labels: ['Activos', 'Mantenimiento', 'Inactivos'],
    datasets: [
      {
        backgroundColor: ['#10b981', '#f59e0b', '#94a3b8'],
        borderWidth: 0,
        data,
      },
    ],
  }
})

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } },
    },
  },
  cutout: '70%',
}

// Gráfico Horizontal Bar: Métodos de Pago
const metodosPagoChartData = computed(() => {
  const m = metodosPago.value || []
  const labels = m.map((x) => x.metodo)
  const data = m.map((x) => x.total || x.cantidad)

  return {
    labels,
    datasets: [
      {
        label: 'Total ($)',
        backgroundColor: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'],
        borderRadius: 6,
        data,
      },
    ],
  }
})

const horizontalBarOptions = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: { grid: { color: '#f1f5f9' } },
    y: { grid: { display: false } },
  },
}

function getIconBadgeClass(idx: number): string {
  const colors = [
    'bg-blue-50 text-blue-700 border border-blue-200',
    'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'bg-amber-50 text-amber-700 border border-amber-200',
    'bg-purple-50 text-purple-700 border border-purple-200',
  ]
  return colors[idx % colors.length]
}

function getIconEmoji(icono: string): string {
  const map: Record<string, string> = {
    users: '👥',
    bus: '🚌',
    'map-pin': '📍',
    'dollar-sign': '💰',
    ticket: '🎟️',
    clock: '🕒',
    navigation: '🧭',
    truck: '🚍',
    compass: '🗺️',
    'check-circle': '✅',
  }
  return map[icono] || '📊'
}
</script>
