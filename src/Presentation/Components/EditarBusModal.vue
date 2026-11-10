<template>
  <ModalBase
    :model-value="modelValue"
    :title="`Editar bus${bus?.numero ? ' N.º ' + bus.numero : ''}`"
    max-width="lg"
    :close-on-click-outside="!loading"
    @update:model-value="emit('update:modelValue', $event)"
    @close="cerrarModal"
  >
    <form id="form-editar-bus" class="space-y-4" @submit.prevent="onSubmit">
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
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5"
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
              Vehículo en edición
            </p>
            <p class="text-sm font-bold text-slate-900">{{ bus.placa || 'Sin placa' }}</p>
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
          label="Número de bus (Disco)"
          placeholder="Ej. 25"
          required
          :model-value="numero"
          :disabled="loading"
          :error="errorNumero"
          helper-text="Identificador interno o número de disco."
          @update:model-value="onNumeroInput"
        />

        <InputBase
          id="editar-bus-placa"
          label="Placa vehicular"
          placeholder="Ej. PBA-1234"
          required
          :model-value="placa"
          :disabled="loading"
          :error="errorPlaca"
          :helper-text="helperPlaca || 'Formato oficial ANT (ej. PBA-1234 o PBA-254).'"
          @update:model-value="onPlacaInput"
        />

        <InputBase
          id="editar-bus-asientos"
          label="Capacidad total"
          type="number"
          min="1"
          max="90"
          step="1"
          required
          :model-value="totalAsientos"
          :disabled="loading"
          :error="errorAsientos"
          helper-text="Número entero mayor a 0 (ej. 40)."
          @update:model-value="onTotalAsientosInput"
        />

        <div class="space-y-1.5">
          <label
            for="editar-bus-estructura"
            class="block text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            Estructura del Bus <span class="text-red-500" aria-hidden="true">*</span>
          </label>
          <div class="relative">
            <select
              id="editar-bus-estructura"
              v-model="estructura"
              :disabled="loading"
              class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 appearance-none pr-10"
            >
              <option value="UnPiso">Un piso (Estándar)</option>
              <option value="DosPisos">Dos pisos (Doble piso)</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <p class="text-[11px] text-slate-400">Configuración física del vehículo.</p>
        </div>
      </div>
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
import { computed, watch } from 'vue'
import ModalBase from './ModalBase.vue'
import InputBase from './InputBase.vue'
import ButtonBase from './ButtonBase.vue'
import { useBusFormValidation } from '../Composables/useBusFormValidation'

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

const {
  numero,
  placa,
  totalAsientos,
  estructura,
  errorNumero,
  errorPlaca,
  errorAsientos,
  helperPlaca,
  onNumeroInput,
  onPlacaInput,
  onTotalAsientosInput,
  validateAll,
  initForm,
} = useBusFormValidation()

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

  initForm({
    numero: bus.numero,
    placa: bus.placa,
    totalAsientos: bus.totalAsientos,
    estructura: bus.estructura ?? 'UnPiso',
  })
}

watch(
  () => [props.modelValue, props.bus] as const,
  ([abierto, bus]) => {
    if (abierto) cargarBorrador(bus)
  },
  { immediate: true },
)

function onSubmit() {
  if (props.loading || !props.bus?.id) return

  if (!validateAll()) return

  emit('save', {
    id: props.bus.id,
    numero: String(numero.value).trim(),
    placa: String(placa.value).trim(),
    totalAsientos: Number(totalAsientos.value),
    estructura: estructura.value,
  })
}

function cerrarModal() {
  emit('update:modelValue', false)
  emit('close')
}
</script>
