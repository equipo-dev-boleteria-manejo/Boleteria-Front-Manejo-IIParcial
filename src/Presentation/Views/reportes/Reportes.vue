<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- Encabezado Principal y Acciones -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
      <div>
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">Auditoría y Trazabilidad del Sistema</h1>
        <p class="text-xs text-slate-500 mt-1">
          Registro inmutable de eventos, gestión de cambios y control operativo de la plataforma.
        </p>
      </div>
      <div>
        <ButtonBase
          variant="outline"
          size="md"
          :loading="loading.auditoria || loading.cambios"
          @click="recargarTodo"
        >
          🔄 Actualizar Registros
        </ButtonBase>
      </div>
    </div>

    <!-- Banner de Error si falla la carga -->
    <div
      v-if="error.auditoria || error.cambios"
      class="p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-center justify-between"
      role="alert"
    >
      <div class="flex items-center gap-2">
        <span>⚠️</span>
        <span>{{ error.auditoria || error.cambios }}</span>
      </div>
      <button type="button" @click="recargarTodo" class="underline font-bold text-red-700">Reintentar</button>
    </div>

    <!-- Sección de KPIs: Resumen de Gestión de Cambios (CCB) -->
    <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-[10px] font-bold uppercase tracking-wider">Total Cambios Implementados</span>
          <span class="text-xl">📊</span>
        </div>
        <p class="text-3xl font-black text-slate-900 mt-3">
          {{ resumenCambios?.total ?? 0 }}
        </p>
        <p class="text-[11px] text-slate-400 mt-1">Control de configuración y versiones</p>
      </div>

      <div class="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-[10px] font-bold uppercase tracking-wider">Cambios Estándar</span>
          <span class="text-xl">⚙️</span>
        </div>
        <p class="text-3xl font-black text-blue-600 mt-3">
          {{ resumenCambios?.estandar ?? 0 }}
        </p>
        <p class="text-[11px] text-slate-400 mt-1">Pre-aprobados y de bajo riesgo</p>
      </div>

      <div class="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-[10px] font-bold uppercase tracking-wider">Cambios Normales</span>
          <span class="text-xl">📋</span>
        </div>
        <p class="text-3xl font-black text-indigo-600 mt-3">
          {{ resumenCambios?.normal ?? 0 }}
        </p>
        <p class="text-[11px] text-slate-400 mt-1">Revisados por comité técnico</p>
      </div>

      <div class="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-[10px] font-bold uppercase tracking-wider">Cambios de Emergencia</span>
          <span class="text-xl">🚨</span>
        </div>
        <p class="text-3xl font-black text-amber-600 mt-3">
          {{ resumenCambios?.emergencia ?? 0 }}
        </p>
        <p class="text-[11px] text-slate-400 mt-1">Incidentes operativos resueltos</p>
      </div>
    </section>

    <!-- Barra de Filtros y Búsqueda de Auditoría -->
    <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="w-full md:w-80">
        <InputBase
          v-model="busqueda"
          placeholder="Buscar por acción, usuario o detalle..."
          container-class="w-full"
        >
          <template #prefix>
            <span class="text-sm">🔍</span>
          </template>
        </InputBase>
      </div>

      <div class="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
        <div class="flex items-center gap-2">
          <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Resultado:</label>
          <select
            v-model="filtroResultado"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="Todos">Todos</option>
            <option value="Exito">Éxito</option>
            <option value="Fallo">Fallo</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Filas:</label>
          <select
            v-model="itemsPerPage"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
      class="rounded-2xl bg-white border border-slate-200/80 p-16 text-center shadow-sm space-y-4"
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

    <!-- Estado 3: VACÍO -->
    <div
      v-else-if="eventosFiltrados.length === 0"
      class="rounded-2xl bg-white border border-slate-200/80 p-16 text-center shadow-sm space-y-3"
    >
      <div class="text-4xl text-slate-300">📜</div>
      <h3 class="text-base font-black text-slate-800">Sin registros de auditoría</h3>
      <p class="text-xs text-slate-500 max-w-sm mx-auto">
        No se encontraron eventos registrados con los filtros seleccionados.
      </p>
      <div class="pt-2">
        <ButtonBase variant="outline" size="sm" @click="resetFiltros">
          Limpiar Búsqueda
        </ButtonBase>
      </div>
    </div>

    <!-- Estado 4: TABLA DE DATOS -->
    <div v-else class="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
            <tr>
              <th scope="col" class="px-6 py-4">Fecha y Hora</th>
              <th scope="col" class="px-6 py-4">Acción Realizada</th>
              <th scope="col" class="px-6 py-4">Entidad Afectada</th>
              <th scope="col" class="px-6 py-4">Detalle Operativo</th>
              <th scope="col" class="px-6 py-4 text-center">Resultado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
            <tr
              v-for="e in eventosPaginados"
              :key="e.id ?? String(e.fecha)"
              class="hover:bg-slate-50/70 transition-colors"
            >
              <td class="px-6 py-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                {{ formatearFecha(e.fecha) }}
              </td>
              <td class="px-6 py-4 font-bold text-slate-900">
                {{ e.accion }}
              </td>
              <td class="px-6 py-4">
                <span class="inline-block px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-700 font-bold">
                  {{ e.entidadAfectada || 'General' }} <span v-if="e.entidadId">#{{ e.entidadId }}</span>
                </span>
              </td>
              <td class="px-6 py-4 text-slate-600 max-w-md truncate" :title="e.detalle">
                {{ e.detalle || 'Sin detalle adicional' }}
              </td>
              <td class="px-6 py-4 text-center">
                <span
                  class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                  :class="e.resultado === 'Fallo' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'"
                >
                  {{ e.resultado || 'Exito' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationControls
        :current-page="currentPage"
        :total-pages="totalPages"
        :total-items="eventosFiltrados.length"
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
import ButtonBase from '../../Components/ButtonBase.vue'
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
  recargarTodo()
})

function recargarTodo() {
  cargarAuditoria(100)
  cargarResumenCambios()
}

watch([busqueda, filtroResultado, itemsPerPage], () => {
  currentPage.value = 1
})

function resetFiltros() {
  busqueda.value = ''
  filtroResultado.value = 'Todos'
  currentPage.value = 1
}

const eventosFiltrados = computed(() => {
  let list = eventosAuditoria.value

  if (filtroResultado.value !== 'Todos') {
    list = list.filter((e) => (e.resultado || 'Exito').toLowerCase() === filtroResultado.value.toLowerCase())
  }

  if (busqueda.value.trim()) {
    const q = busqueda.value.toLowerCase().trim()
    list = list.filter((e) => {
      const accion = (e.accion || '').toLowerCase()
      const entidad = (e.entidadAfectada || '').toLowerCase()
      const detalle = (e.detalle || '').toLowerCase()
      return accion.includes(q) || entidad.includes(q) || detalle.includes(q)
    })
  }

  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(eventosFiltrados.value.length / itemsPerPage.value)))

const eventosPaginados = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return eventosFiltrados.value.slice(start, start + itemsPerPage.value)
})

function formatearFecha(f?: Date | string): string {
  if (!f) return '--'
  const fechaObj = f instanceof Date ? f : new Date(f)
  if (Number.isNaN(fechaObj.getTime())) return String(f)
  return fechaObj.toLocaleString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
</script>
