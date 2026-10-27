<template>
  <ModalBase
    :model-value="modelValue"
    max-width="lg"
    :close-on-click-outside="!loading"
    @update:model-value="emit('update:modelValue', $event)"
    @close="emit('close')"
  >
    <template #header>
      <div>
        <p class="text-[10px] font-bold uppercase tracking-wider text-blue-600">
          Mantenimiento de flota
        </p>
        <h3 class="text-base font-bold text-slate-900">
          Editar bus{{ bus?.numero ? ` N.º ${bus.numero}` : '' }}
        </h3>
        <p class="text-xs text-slate-500 mt-0.5">
          Actualiza los datos técnicos y la capacidad del vehículo.
        </p>
      </div>
    </template>

    <form id="form-editar-bus" class="space-y-5" @submit.prevent="onSubmit">
      <div
        v-if="error"
        role="alert"
        aria-live="assertive"
        class="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700"
      >
        <span aria-hidden="true">⚠️</span>
        <span>{{ error }}</span>
      </div>

      <div
        v-if="bus"
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg text-white shadow-sm shadow-blue-200"
            aria-hidden="true"
          >
            🚌
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Vehículo seleccionado
            </p>
            <p class="text-sm font-bold text-slate-900">{{ bus.placa }}</p>
          </div>
        </div>

        <span
          class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600"
        >
          Estado: {{ estadoLabel }}
        </span>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InputBase
          id="editar-bus-numero"
          label="Número de bus"
          placeholder="Ej. 25"
          required
          :model-value="draft.numero"
          :disabled="loading"
          helper-text="Identificador interno de la unidad."
          @update:model-value="draft.numero = $event"
        />

        <InputBase
          id="editar-bus-placa"
          label="Placa"
          placeholder="Ej. PBA-1234"
          required
          :model-value="draft.placa"
          :disabled="loading"
          helper-text="La placa debe ser única en la cooperativa."
          @update:model-value="draft.placa = $event"
        />

        <InputBase
          id="editar-bus-asientos"
          label="Capacidad total"
          type="number"
          required
          :model-value="draft.totalAsientos"
          :disabled="loading"
          helper-text="Número de asientos disponibles para la venta."
          @update:model-value="onTotalAsientos"
        />

        <div class="space-y-1.5">
          <label
            for="editar-bus-estructura"
            class="block text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            Estructura
            <span class="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="editar-bus-estructura"
            :value="draft.estructura"
            :disabled="loading"
            class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            @change="onEstructuraChange"
          >
            <option value="UnPiso">Un piso</option>
            <option value="DosPisos">Dos pisos</option>
          </select>
          <p class="text-xs text-slate-500">Configuración física del vehículo.</p>
        </div>
      </div>

      <p class="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs leading-relaxed text-blue-700">
        <span aria-hidden="true">ℹ️</span>
        Los cambios de estado operativo (activo, inactivo, mantenimiento) se gestionan desde el
        catálogo de flota para conservar la trazabilidad.
      </p>
    </form>

    <template #footer>
      <ButtonBase variant="secondary" :disabled="loading" @click="cerrarModal">
        Cancelar
      </ButtonBase>
      <ButtonBase type="submit" form="form-editar-bus" :loading="loading">
        Guardar cambios
      </ButtonBase>
    </template>
  </ModalBase>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import ModalBase from './ModalBase.vue'
import InputBase from './InputBase.vue'
import ButtonBase from './ButtonBase.vue'

type EstructuraBus = 'UnPiso' | 'DosPisos'

interface BusEditable {
  id?: number
  numero: string
  placa: string
  totalAsientos: number
  estructura?: EstructuraBus
  estado?: string
}

interface Props {
  modelValue: boolean
  bus: BusEditable | null
  loading?: boolean
  error?: string
}

interface GuardarBusPayload {
  id: number
  numero: string
  placa: string
  totalAsientos: number
  estructura: EstructuraBus
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
  (e: 'save', payload: GuardarBusPayload): void
}>()

const draft = reactive<{
  numero: string
  placa: string
  totalAsientos: number
  estructura: EstructuraBus
}>({
  numero: '',
  placa: '',
  totalAsientos: 0,
  estructura: 'UnPiso',
})

const ESTADOS: Record<string, string> = {
  Activo: 'Activo',
  Inactivo: 'Inactivo',
  Mantenimiento: 'En mantenimiento',
  FueraDeServicio: 'Fuera de servicio',
}

const estadoLabel = computed(() => {
  if (!props.bus?.estado) return 'Sin estado'
  return ESTADOS[props.bus.estado] ?? props.bus.estado
})

function cargarBorrador(bus: BusEditable | null | undefined) {
  if (!bus) return

  draft.numero = bus.numero
  draft.placa = bus.placa
  draft.totalAsientos = bus.totalAsientos
  draft.estructura = bus.estructura ?? 'UnPiso'
}

watch(
  () => [props.modelValue, props.bus] as const,
  ([abierto, bus]) => {
    if (abierto) cargarBorrador(bus)
  },
  { immediate: true },
)

function onTotalAsientos(value: string) {
  draft.totalAsientos = value === '' ? 0 : Number(value)
}

function onEstructuraChange(event: Event) {
  draft.estructura = (event.target as HTMLSelectElement).value as EstructuraBus
}

function onSubmit() {
  if (props.loading || !props.bus?.id) return

  emit('save', {
    id: props.bus.id,
    numero: draft.numero,
    placa: draft.placa,
    totalAsientos: draft.totalAsientos,
    estructura: draft.estructura,
  })
}

function cerrarModal() {
  emit('update:modelValue', false)
  emit('close')
}
</script>
