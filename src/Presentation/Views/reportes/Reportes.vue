<template>
  <div class="space-y-4 max-w-7xl mx-auto font-sans">
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

    <!-- Sección de KPIs: Métricas de Trazabilidad y Auditoría de Sistema -->
    <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Eventos"
        :value="metricasAuditoria.total"
        icon="📋"
        description="Trazabilidad general del sistema"
        variant="default"
      />
      <MetricCard
        title="Operaciones Exitosas"
        :value="metricasAuditoria.exitos"
        icon="✅"
        description="Transacciones ejecutadas correctamente"
        variant="success"
      />
      <MetricCard
        title="Alertas y Fallos"
        :value="metricasAuditoria.fallos"
        icon="🚨"
        description="Errores, bloqueos o rechazos"
        variant="danger"
      />
      <MetricCard
        title="Eventos de Seguridad"
        :value="metricasAuditoria.seguridad"
        icon="🛡️"
        description="Logins, accesos y operaciones de cuenta"
        variant="info"
      />
    </section>

    <!-- Barra de Filtros y Búsqueda de Auditoría -->
    <div class="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
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

      <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
        <div class="flex items-center gap-1.5">
          <label class="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Resultado:</label>
          <select
            v-model="filtroResultado"
            class="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
          >
            <option value="Todos">Todos</option>
            <option value="Exito">Éxito</option>
            <option value="Fallo">Fallo</option>
          </select>
        </div>

        <div class="flex items-center gap-1.5">
          <label class="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Filas:</label>
          <select
            v-model="itemsPerPage"
            class="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
          >
            <option :value="10">10 filas</option>
            <option :value="20">20 filas</option>
            <option :value="50">50 filas</option>
          </select>
        </div>

        <button
          type="button"
          :disabled="loading.auditoria || loading.cambios"
          @click="recargarTodo"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition-all cursor-pointer disabled:opacity-50 ml-1"
        >
          <svg class="h-3.5 w-3.5 text-slate-500" :class="loading.auditoria ? 'animate-spin' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Actualizar Registros</span>
        </button>
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
      v-else-if="totalEventos === 0"
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
import { onMounted } from 'vue'
import { useReportes } from '../../Composables/useReportes'
import MetricCard from '../../Components/MetricCard.vue'
import InputBase from '../../Components/InputBase.vue'
import PaginationControls from '../../Components/PaginationControls.vue'

const {
  metricasAuditoria,
  busqueda,
  filtroResultado,
  currentPage,
  itemsPerPage,
  eventosFiltrados,
  eventosPaginados,
  totalEventos,
  totalPages,
  loading,
  error,
  limpiarFiltros,
  recargarTodo,
} = useReportes()

onMounted(() => {
  recargarTodo()
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
