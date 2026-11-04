<template>
  <div class="rounded-2xl bg-white shadow-sm border border-slate-200/80 overflow-hidden">
    <!-- Encabezado de la lista -->
    <div class="bg-slate-50/80 px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-base">🚌</span>
        <h4 class="font-bold text-xs uppercase tracking-wider text-slate-700">
          Trayectos Asignados
        </h4>
      </div>
      <span
        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
        :class="rutas.length > 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'"
      >
        {{ rutas.length }} {{ rutas.length === 1 ? 'trayecto' : 'trayectos' }}
      </span>
    </div>

    <!-- 1. Estado de Carga (Loading) -->
    <div v-if="loading" class="p-8 space-y-3" role="status" aria-label="Cargando trayectos">
      <div class="animate-pulse space-y-2.5">
        <div class="h-10 bg-slate-100 rounded-xl w-full"></div>
        <div class="h-10 bg-slate-100 rounded-xl w-full"></div>
        <div class="h-10 bg-slate-100 rounded-xl w-full"></div>
      </div>
      <p class="text-center text-xs text-slate-400 font-medium pt-2">Cargando trayectos operativos...</p>
    </div>

    <!-- 2. Estado de Error -->
    <div
      v-else-if="error"
      role="alert"
      class="m-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2"
    >
      <span class="text-base">⚠️</span>
      <span>{{ error }}</span>
    </div>

    <!-- 3. Estado Vacío (Empty State) -->
    <div
      v-else-if="rutas.length === 0"
      class="p-10 text-center space-y-2"
    >
      <div class="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-xl">
        📭
      </div>
      <p class="text-sm font-bold text-slate-700">Sin trayectos asignados</p>
      <p class="text-xs text-slate-400 max-w-sm mx-auto">
        No se han vinculado buses a frecuencias en esta hoja de ruta todavía.
      </p>
    </div>

    <!-- 4. Estado con Datos (Success / Data) -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-xs sm:text-sm">
        <thead class="bg-slate-50/60 text-slate-500 text-[11px] uppercase font-bold tracking-wider border-b border-slate-100">
          <tr>
            <th class="px-4 py-3">Salida</th>
            <th class="px-4 py-3">Unidad / Bus</th>
            <th class="px-4 py-3">Modalidad</th>
            <th class="px-4 py-3">Estado</th>
            <th v-if="!readonly" class="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="ruta in ordenadasPorHora"
            :key="ruta.id || `${ruta.busId}-${ruta.frecuenciaId}-${ruta.horaSalida}`"
            class="hover:bg-slate-50/70 transition-colors"
          >
            <!-- Hora -->
            <td class="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
              <span class="inline-flex items-center gap-1.5 font-mono text-sm text-slate-800">
                <span>⏱️</span>
                <span>{{ ruta.horaSalida || '--:--' }}</span>
              </span>
              <span v-if="ruta.horaLlegada" class="block text-[10px] text-slate-400 font-normal">
                Llegada: {{ ruta.horaLlegada }}
              </span>
            </td>

            <!-- Bus -->
            <td class="px-4 py-3.5 whitespace-nowrap">
              <div class="flex items-center gap-2">
                <span class="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-100">
                  {{ ruta.busId }}
                </span>
                <span class="font-medium text-slate-700 text-xs">Unidad #{{ ruta.busId }}</span>
              </div>
            </td>

            <!-- Modalidad Directo / Con Paradas (Interactivo) -->
            <td class="px-4 py-3.5 whitespace-nowrap">
              <button
                type="button"
                :disabled="readonly"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase transition-all duration-150 select-none cursor-pointer active:scale-95 disabled:cursor-default disabled:active:scale-100"
                :class="ruta.esDirecta
                  ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'"
                :title="readonly ? '' : 'Clic para alternar modalidad directo / con paradas'"
                @click="emit('toggle-directo', ruta)"
              >
                <span>{{ ruta.esDirecta ? '⚡' : '🛑' }}</span>
                <span>{{ ruta.esDirecta ? 'Directo' : 'Con Paradas' }}</span>
              </button>
            </td>

            <!-- Estado -->
            <td class="px-4 py-3.5 whitespace-nowrap">
              <span
                class="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border"
                :class="getEstadoClass(ruta.estado)"
              >
                {{ ruta.estado }}
              </span>
            </td>

            <!-- Acciones -->
            <td v-if="!readonly" class="px-4 py-3.5 text-right whitespace-nowrap">
              <div class="flex items-center justify-end gap-1.5">
                <ButtonBase
                  v-if="ruta.estado === 'Programada'"
                  size="sm"
                  variant="primary"
                  @click="emit('iniciar-viaje', ruta)"
                >
                  Iniciar
                </ButtonBase>

                <ButtonBase
                  v-if="ruta.estado === 'EnCurso'"
                  size="sm"
                  variant="success"
                  @click="emit('finalizar-viaje', ruta)"
                >
                  Finalizar
                </ButtonBase>

                <ButtonBase
                  v-if="ruta.estado === 'Programada'"
                  size="sm"
                  variant="danger"
                  @click="emit('cancelar-viaje', ruta)"
                >
                  Cancelar
                </ButtonBase>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Ruta } from '../../../Domain/Entities/Ruta'
import ButtonBase from '../ButtonBase.vue'

interface Props {
  rutas: Ruta[]
  loading?: boolean
  error?: string | null
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  rutas: () => [],
  loading: false,
  error: null,
  readonly: false,
})

const emit = defineEmits<{
  (e: 'toggle-directo', ruta: Ruta): void
  (e: 'iniciar-viaje', ruta: Ruta): void
  (e: 'finalizar-viaje', ruta: Ruta): void
  (e: 'cancelar-viaje', ruta: Ruta): void
}>()

const ordenadasPorHora = computed(() => {
  return [...props.rutas].sort((a, b) => {
    if (!a.horaSalida || !b.horaSalida) return 0
    return a.horaSalida.localeCompare(b.horaSalida)
  })
})

function getEstadoClass(estado: string): string {
  switch (estado) {
    case 'Programada':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'EnCurso':
      return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
    case 'Finalizada':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'Cancelada':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}
</script>

