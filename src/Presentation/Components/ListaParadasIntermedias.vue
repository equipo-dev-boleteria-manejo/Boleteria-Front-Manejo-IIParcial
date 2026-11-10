<template>
  <section class="space-y-4" aria-label="Paradas intermedias de la frecuencia" :aria-busy="loading">
    <div class="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
      <p class="text-xs text-slate-500">
        Ordenadas desde el origen. El tiempo se cuenta desde la hora de salida.
      </p>
      <span
        class="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600"
      >
        {{ paradas.length }} {{ paradas.length === 1 ? 'parada' : 'paradas' }}
      </span>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      role="alert"
      aria-live="assertive"
      class="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700"
    >
      <span aria-hidden="true">⚠️</span>
      <span>{{ error }}</span>
    </div>

    <!-- Lista (con su estado vacío) -->
    <TableBase
      :empty="paradas.length === 0"
      empty-icon="📍"
      empty-title="Sin paradas intermedias"
      empty-description="Esta frecuencia no tiene paradas intermedias. Agrega la primera con el formulario de abajo."
      aria-label="Lista de paradas intermedias"
    >
      <!-- Cabecera compacta: el modal es más angosto que el catálogo y no debe generar scroll horizontal. -->
      <template #thead>
        <tr>
          <th
            v-for="columna in columnas"
            :key="columna.key"
            scope="col"
            class="px-2 py-3"
            :class="columna.align === 'center' ? 'text-center' : columna.align === 'right' ? 'text-right' : 'text-left'"
          >
            {{ columna.label }}
          </th>
        </tr>
      </template>
      <tr v-for="parada in paradas" :key="parada.id" class="transition-colors hover:bg-blue-50/50">
        <td class="px-2 py-2.5">
          <span
            class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 ring-1 ring-slate-200"
          >
            {{ parada.orden }}
          </span>
        </td>
        <td class="px-2 py-2.5 text-sm font-bold leading-tight text-slate-900">{{ parada.ciudad }}</td>
        <td class="px-2 py-2.5">{{ parada.tiempo }}</td>
        <td class="px-2 py-2.5 text-center">
          <span
            class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-2xs"
            :class="
              parada.permiteVenta
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-100 text-slate-600'
            "
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="parada.permiteVenta ? 'bg-emerald-500' : 'bg-slate-400'"
              aria-hidden="true"
            ></span>
            {{ parada.permiteVenta ? 'Permite venta' : 'Sin venta' }}
          </span>
        </td>
        <td class="px-2 py-2.5">
          <span
            class="inline-block rounded-md border border-slate-200/80 bg-slate-50 px-2.5 py-1 font-mono text-xs font-bold text-slate-700"
          >
            {{ parada.costo }}
          </span>
        </td>
        <td class="px-2 py-2.5 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <ActionButton
              action="edit"
              label="Editar"
              :disabled="loading"
              :aria-label="`Editar la parada ${parada.ciudad}`"
              @click="cargar(parada)"
            />
            <ActionButton
              action="danger"
              label="Eliminar"
              :disabled="loading"
              :aria-label="`Eliminar la parada ${parada.ciudad}`"
              @click="emit('eliminar', parada.id)"
            />
          </div>
        </td>
      </tr>
    </TableBase>

    <!-- Formulario para agregar una parada -->
    <form
      class="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
      aria-label="Agregar parada intermedia"
      novalidate
      @submit.prevent="enviar"
    >
      <h4 class="text-xs font-black uppercase tracking-wider text-slate-600">
        {{ estaEditando ? 'Editar parada' : 'Agregar parada' }}
      </h4>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InputBase
          id="parada-ciudad"
          v-model="formulario.ciudad"
          label="Ciudad"
          placeholder="Ej. Latacunga"
          required
          :disabled="loading"
          :error="erroresVisibles.ciudad"
        />
        <InputBase
          id="parada-orden"
          v-model="formulario.orden"
          label="Orden"
          type="number"
          min="1"
          step="1"
          required
          :disabled="loading"
          :error="erroresVisibles.orden"
        />
        <InputBase
          id="parada-minutos"
          v-model="formulario.minutosDesdeOrigen"
          label="Minutos desde origen"
          type="number"
          min="0"
          step="1"
          placeholder="Ej. 120"
          required
          :disabled="loading"
          :error="erroresVisibles.minutosDesdeOrigen"
        />
        <InputBase
          id="parada-costo"
          v-model="formulario.costoProporcional"
          label="Costo proporcional"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          :disabled="loading"
          :error="erroresVisibles.costoProporcional"
        />
      </div>

      <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
          <input
            v-model="formulario.permiteVenta"
            type="checkbox"
            :disabled="loading"
            class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
          />
          Permite venta de pasajes en esta parada
        </label>

        <div class="flex items-center gap-2">
          <ButtonBase v-if="estaEditando" variant="secondary" :disabled="loading" @click="limpiar">
            Cancelar edición
          </ButtonBase>
          <ButtonBase v-if="estaEditando" type="submit" :loading="loading" :disabled="hayErroresVisibles">
            Guardar cambios
          </ButtonBase>
          <CreateButton v-else type="submit" label="Agregar parada" :loading="loading" :disabled="hayErroresVisibles" />
        </div>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useParadaFormValidation } from '../Composables/useParadaFormValidation'
import InputBase from './InputBase.vue'
import TableBase from './TableBase.vue'
import ActionButton from './ActionButton.vue'
import ButtonBase from './ButtonBase.vue'
import CreateButton from './CreateButton.vue'
import type { ParadaIntermediaDto } from '../../Application/Dtos/CrearFrecuenciaDto'
import type { FilaParada } from '../Composables/presentacionFrecuencias'

interface Props {
  paradas: readonly FilaParada[]
  /** Origen y destino de la frecuencia: no pueden repetirse como parada intermedia. */
  extremos?: readonly string[]
  ordenSugerido?: number
  loading?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  extremos: () => [],
  ordenSugerido: 1,
  loading: false,
  error: null,
})

const emit = defineEmits<{
  (e: 'agregar', dto: ParadaIntermediaDto): void
  (e: 'actualizar', payload: { id: number; cambios: ParadaIntermediaDto }): void
  (e: 'eliminar', paradaId: number): void
  (e: 'sinCambios'): void
}>()

interface Columna {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
}

const columnas: Columna[] = [
  { key: 'orden', label: 'Orden' },
  { key: 'ciudad', label: 'Ciudad' },
  { key: 'tiempo', label: 'Desde origen' },
  { key: 'venta', label: 'Venta', align: 'center' },
  { key: 'costo', label: 'Costo prop.' },
  { key: 'acciones', label: 'Acciones', align: 'right' },
]

const {
  formulario,
  erroresVisibles,
  hayErroresVisibles,
  estaEditando,
  hayCambios,
  editandoId,
  validarTodo,
  limpiar,
  cargar,
  sugerirOrden,
  aDto,
} = useParadaFormValidation({
    extremos: () => props.extremos,
    ordenesExistentes: () => props.paradas.map((parada) => parada.orden),
    ordenSugerido: () => props.ordenSugerido,
  })

let enviando = false

function enviar() {
  if (!validarTodo()) return
  if (editandoId.value !== null && !hayCambios.value) {
    emit('sinCambios')
    limpiar()
    return
  }
  enviando = true
  if (editandoId.value !== null) {
    emit('actualizar', { id: editandoId.value, cambios: aDto() })
    return
  }
  emit('agregar', aDto())
}

// Si la parada que se edita desaparece de la lista (por ejemplo, se eliminó), se cancela la edición.
watch(
  () => props.paradas,
  (paradas) => {
    if (editandoId.value !== null && !paradas.some((parada) => parada.id === editandoId.value)) limpiar()
  },
)

// El orden sugerido cambia cuando la lista se actualiza (agregar o eliminar una parada).
watch(() => props.ordenSugerido, sugerirOrden)

// Al terminar de guardar sin error se limpia el formulario; si falló, se conservan los datos.
watch(
  () => props.loading,
  (cargando, estabaCargando) => {
    if (estabaCargando && !cargando && enviando) {
      enviando = false
      if (!props.error) limpiar()
    }
  },
)
</script>
