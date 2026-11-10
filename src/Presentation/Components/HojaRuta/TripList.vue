<template>
  <div class="space-y-3">
    <!-- Error al cargar o modificar los trayectos -->
    <div
      v-if="error"
      role="alert"
      aria-live="assertive"
      class="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700"
    >
      <span aria-hidden="true">⚠️</span>
      <span>{{ error }}</span>
    </div>

    <TableBase
      title="Trayectos asignados"
      :subtitle="`${rutas.length} ${rutas.length === 1 ? 'trayecto' : 'trayectos'}`"
      :loading="loading"
      :empty="filas.length === 0"
      empty-icon="📭"
      empty-title="Sin trayectos asignados"
      empty-description="No se han vinculado buses a frecuencias en esta hoja de ruta todavía."
      :columns="columnas"
      aria-label="Trayectos de la hoja de ruta"
    >
      <tr v-for="fila in filas" :key="fila.clave" class="transition-colors hover:bg-blue-50/50">
        <!-- Hora -->
        <td class="px-6 py-3 whitespace-nowrap">
          <span class="font-mono text-sm font-bold text-slate-900">{{ fila.hora }}</span>
          <span v-if="fila.llegada" class="block text-[10px] font-normal text-slate-400">
            Llegada: {{ fila.llegada }}
          </span>
        </td>

        <!-- Unidad -->
        <td class="px-6 py-3 whitespace-nowrap font-bold text-slate-800">{{ fila.bus }}</td>

        <!-- Modalidad -->
        <td class="px-6 py-3 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
              :class="
                fila.esDirecta
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              "
            >
              {{ fila.modalidad }}
            </span>
            <ActionButton
              v-if="!readonly && fila.puedeCambiarModalidad"
              action="edit"
              label="Cambiar"
              :aria-label="`Cambiar la modalidad del trayecto de las ${fila.hora} (${fila.bus})`"
              @click="emit('toggle-directo', fila.ruta)"
            />
          </div>
        </td>

        <!-- Estado -->
        <td class="px-6 py-3 whitespace-nowrap">
          <span
            class="inline-block rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
            :class="fila.claseEstado"
          >
            {{ fila.estado }}
          </span>
        </td>

        <!-- Acciones -->
        <td v-if="!readonly" class="px-6 py-3 text-right whitespace-nowrap">
          <div class="flex items-center justify-end gap-2">
            <ActionButton
              v-if="fila.puedeIniciar"
              action="primary"
              label="Iniciar"
              :disabled="Boolean(fila.iniciarBloqueadoPor)"
              :title="fila.iniciarBloqueadoPor || undefined"
              :aria-label="`Iniciar el trayecto de las ${fila.hora} (${fila.bus})`"
              @click="emit('iniciar-viaje', fila.ruta)"
            />
            <ActionButton
              v-if="fila.puedeFinalizar"
              action="success"
              label="Finalizar"
              :aria-label="`Finalizar el trayecto de las ${fila.hora} (${fila.bus})`"
              @click="emit('finalizar-viaje', fila.ruta)"
            />
            <ActionButton
              v-if="fila.puedeCancelar"
              action="danger"
              label="Cancelar"
              :aria-label="`Cancelar el trayecto de las ${fila.hora} (${fila.bus})`"
              @click="emit('cancelar-viaje', fila.ruta)"
            />
          </div>
        </td>
      </tr>
    </TableBase>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Bus } from '../../../Domain/Entities/Bus'
import type { Frecuencia } from '../../../Domain/Entities/Frecuencia'
import type { Ruta } from '../../../Domain/Entities/Ruta'
import { aFilaTrayecto, ordenarPorHora } from '../../Composables/presentacionRutas'
import ActionButton from '../ActionButton.vue'
import TableBase from '../TableBase.vue'

interface Props {
  rutas: Ruta[]
  /** Buses cargados, para mostrar su número y placa en lugar del id interno. */
  buses?: Bus[]
  /** Frecuencias cargadas: permiten saber si un trayecto directo puede pasar a "con paradas". */
  frecuencias?: readonly Frecuencia[]
  loading?: boolean
  error?: string | null
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  rutas: () => [],
  buses: () => [],
  frecuencias: () => [],
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

const filas = computed(() => ordenarPorHora(props.rutas).map((ruta) => aFilaTrayecto(ruta, props.buses, undefined, props.frecuencias)))

const columnas = computed(() => [
  { key: 'salida', label: 'Salida' },
  { key: 'unidad', label: 'Unidad' },
  { key: 'modalidad', label: 'Modalidad' },
  { key: 'estado', label: 'Estado' },
  ...(props.readonly ? [] : [{ key: 'acciones', label: 'Acciones', align: 'right' as const }]),
])
</script>
