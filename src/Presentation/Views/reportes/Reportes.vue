<template>
  <div class="space-y-6 max-w-7xl mx-auto font-sans">
    <!-- Encabezado Principal y Acciones (Estilo IHC-Grupo2) -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div>
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">Auditoría y Trazabilidad del Sistema</h1>
        <p class="text-xs text-slate-500 mt-1">
          Registro inmutable de eventos, gestión de cambios CCB y control operativo de la plataforma.
        </p>
      </div>
      <div>
        <button
          type="button"
          :disabled="loading.auditoria || loading.cambios"
          @click="recargarTodo"
          class="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          <svg class="h-4 w-4 text-slate-500" :class="loading.auditoria ? 'animate-spin' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Actualizar Registros</span>
        </button>
      </div>
    </div>

    <!-- Banner de Error si falla la carga -->
    <div
      v-if="error.auditoria || error.cambios"
      class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center justify-between shadow-xs"
      role="alert"
    >
      <div class="flex items-center gap-2.5">
        <svg class="h-5 w-5 text-rose-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>{{ error.auditoria || error.cambios }}</span>
      </div>
      <button type="button" @click="recargarTodo" class="underline font-bold text-rose-700 hover:text-rose-900 cursor-pointer">Reintentar</button>
    </div>

    <!-- Sección de KPIs: Resumen de Gestión de Cambios CCB (Estilo IHC-Grupo2) -->
    <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between text-slate-500">
          <span class="text-xs font-bold uppercase tracking-wide">Total Cambios CCB</span>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            📊
          </div>
        </div>
        <p class="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
          {{ resumenCambios?.total ?? 0 }}
        </p>
        <p class="text-[11px] text-slate-400 mt-1">Control de configuración y versiones</p>
      </article>

      <article class="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 shadow-xs hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between text-blue-800">
          <span class="text-xs font-bold uppercase tracking-wide">Cambios Estándar</span>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
            ⚙️
          </div>
        </div>
        <p class="text-3xl font-extrabold text-blue-700 mt-3 tracking-tight">
          {{ resumenCambios?.estandar ?? 0 }}
        </p>
        <p class="text-[11px] text-blue-600 mt-1">Pre-aprobados y de bajo riesgo</p>
      </article>

      <article class="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-xs hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between text-indigo-800">
          <span class="text-xs font-bold uppercase tracking-wide">Cambios Normales</span>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-800">
            📋
          </div>
        </div>
        <p class="text-3xl font-extrabold text-indigo-700 mt-3 tracking-tight">
          {{ resumenCambios?.normal ?? 0 }}
        </p>
        <p class="text-[11px] text-indigo-600 mt-1">Revisados por comité técnico</p>
      </article>

      <article class="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-xs hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between text-amber-900">
          <span class="text-xs font-bold uppercase tracking-wide">Emergencias</span>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
            🚨
          </div>
        </div>
        <p class="text-3xl font-extrabold text-amber-700 mt-3 tracking-tight">
          {{ resumenCambios?.emergencia ?? 0 }}
        </p>
        <p class="text-[11px] text-amber-800 mt-1">Incidentes operativos resueltos</p>
      </article>
    </section>

    <!-- Barra de Filtros y Búsqueda de Auditoría -->
    <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="w-full md:w-80">
        <InputBase
          v-model="busqueda"
          placeholder="Buscar por acción, usuario o detalle..."
          container-class="w-full"
        >
          <template #prefix>
            <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </template>
        </InputBase>
      </div>

      <div class="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
        <div class="flex items-center gap-2">
          <label class="text-xs font-bold text-slate-600 uppercase tracking-wider">Resultado:</label>
          <select
            v-model="filtroResultado"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
          >
            <option value="Todos">Todos</option>
            <option value="Exito">Éxito</option>
            <option value="Fallo">Fallo</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <label class="text-xs font-bold text-slate-600 uppercase tracking-wider">Filas:</label>
          <select
            v-model="itemsPerPage"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
          >
            <option :value="10">10 por página</option>
            <option :value="20">20 por página</option>
            <option :value="50">50 por página</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Estado 1: CARGANDO -->
    <div
      v-if="loading.auditoria"
      class="rounded-2xl bg-white border border-slate-200 p-16 text-center shadow-sm space-y-4"
      aria-busy="true"
    >
      <div class="animate-spin h-8 w-8 text-blue-600 mx-auto">
        <svg class="w-full h-full" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Recuperando registros de auditoría...</p>
    </div>

    <!-- Estado 2: VACÍO -->
    <div
      v-else-if="eventosFiltrados.length === 0"
      class="rounded-2xl bg-white border border-slate-200 p-16 text-center shadow-sm space-y-3"
    >
      <div class="text-4xl text-slate-300">📋</div>
      <h3 class="text-base font-black text-slate-800">No hay registros de auditoría disponibles</h3>
      <p class="text-xs text-slate-500 max-w-sm mx-auto">
        No se encontraron transacciones registradas con los filtros actuales.
      </p>
      <div class="pt-2">
        <button
          type="button"
          @click="limpiarFiltros"
          class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Restablecer Filtros
        </button>
      </div>
    </div>

    <!-- Estado 3: TABLA DE DATOS -->
    <div v-else class="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm border-collapse" aria-label="Tabla de registros de auditoría">
          <thead class="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-600 tracking-wider">
            <tr>
              <th scope="col" class="px-6 py-4">Fecha / Hora</th>
              <th scope="col" class="px-6 py-4">Acción Operativa</th>
              <th scope="col" class="px-6 py-4">Entidad Afectada</th>
              <th scope="col" class="px-6 py-4">Detalle de la Operación</th>
              <th scope="col" class="px-6 py-4 text-center">Resultado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
            <tr
              v-for="e in eventosPaginados"
              :key="e.id"
              class="hover:bg-blue-50/50 transition-colors"
            >
              <td class="px-6 py-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                {{ formatFecha(e.fecha) }}
              </td>
              <td class="px-6 py-4">
                <span class="inline-block font-bold text-slate-900 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-md text-xs">
                  {{ e.accion }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span class="font-bold text-slate-700">
                  {{ e.entidadAfectada || 'Sistema' }}
                </span>
                <span v-if="e.entidadId" class="text-slate-400 font-mono text-[10px] ml-1">
                  (#{{ e.entidadId }})
                </span>
              </td>
              <td class="px-6 py-4 max-w-md truncate text-slate-600" :title="e.detalle">
                {{ e.detalle || 'Sin detalle adicional' }}
              </td>
              <td class="px-6 py-4 text-center">
                <span
                  class="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-2xs"
                  :class="resultadoBadgeClass(e.resultado)"
                >
                  {{ e.resultado || 'Exito' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <PaginationControls
        :current-page="currentPage"
        :total-pages="totalPages"
        :total-items="totalEventos"
        :items-per-page="itemsPerPage"
        :has-prev-page="currentPage > 1"
        :has-next-page="currentPage < totalPages"
        @prev="currentPage--"
        @next="currentPage++"
        @set-page="(p) => currentPage = p"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useReportes } from '../../Composables/useReportes'
import InputBase from '../../Components/InputBase.vue'
import PaginationControls from '../../Components/PaginationControls.vue'

const {
  eventosAuditoria,
  resumenCambios,
  loading,
  error,
  cargarAuditoria,
  cargarResumenCambios,
} = useReportes()

const busqueda = ref('')
const filtroResultado = ref('Todos')
const currentPage = ref(1)
const itemsPerPage = ref(10)

onMounted(() => {
  cargarAuditoria()
  cargarResumenCambios()
})

function recargarTodo() {
  cargarAuditoria()
  cargarResumenCambios()
}

watch([busqueda, filtroResultado, itemsPerPage], () => {
  currentPage.value = 1
})

function limpiarFiltros() {
  busqueda.value = ''
  filtroResultado.value = 'Todos'
  currentPage.value = 1
}

const eventosFiltrados = computed(() => {
  return eventosAuditoria.value.filter((e) => {
    if (filtroResultado.value !== 'Todos') {
      const res = (e.resultado || '').toLowerCase()
      if (res !== filtroResultado.value.toLowerCase()) return false
    }

    if (busqueda.value.trim() !== '') {
      const q = busqueda.value.trim().toLowerCase()
      const accion = (e.accion || '').toLowerCase()
      const detalle = (e.detalle || '').toLowerCase()
      const entidad = (e.entidadAfectada || '').toLowerCase()

      return accion.includes(q) || detalle.includes(q) || entidad.includes(q)
    }

    return true
  })
})

const totalEventos = computed(() => eventosFiltrados.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalEventos.value / itemsPerPage.value)))

const eventosPaginados = computed(() => {
  const inicio = (currentPage.value - 1) * itemsPerPage.value
  return eventosFiltrados.value.slice(inicio, inicio + itemsPerPage.value)
})

function formatFecha(fecha?: Date | string): string {
  if (!fecha) return 'N/D'
  const d = new Date(fecha)
  return d.toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function resultadoBadgeClass(resultado?: string): string {
  const r = (resultado || '').toLowerCase()
  if (r.includes('exito') || r.includes('success')) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  }
  return 'bg-rose-50 text-rose-800 border-rose-200'
}
</script>
