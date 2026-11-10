<template>
  <ModalBase
    :model-value="modelValue"
    title="REPORTAR INCIDENTE DE BUS"
    max-width="2xl"
    :close-on-click-outside="!loading"
    @update:model-value="emit('update:modelValue', $event)"
    @close="emit('close')"
  >
    <form
      id="form-reportar-incidente"
      class="space-y-3.5"
      novalidate
      @submit.prevent="onSubmit"
    >
      <div
        v-if="error"
        role="alert"
        aria-live="assertive"
        class="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700"
      >
        <span aria-hidden="true">⚠️</span>
        <span>{{ error }}</span>
      </div>

      <!-- Resumen del bus afectado -->
      <div
        v-if="bus"
        class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3.5 py-2 text-xs"
      >
        <div class="flex items-center gap-2">
          <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white text-xs shadow-xs" aria-hidden="true">
            🚌
          </span>
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="font-bold text-slate-900">
              N.º {{ bus.numero }} · {{ bus.placa }}
            </span>
            <span class="text-[11px] text-slate-500">
              (Estado actual: <strong class="text-blue-700">{{ estadoLabel }}</strong>)
            </span>
          </div>
        </div>

        <div class="text-[11px] text-slate-500">
          Reportado por: <span class="font-bold text-slate-700">{{ form.reportadoPor || 'Administrador' }}</span>
        </div>
      </div>

      <!-- Fecha del incidente y Bus de reemplazo -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InputBase
          id="incidente-fecha"
          label="Fecha del incidente"
          type="date"
          required
          :min="fechaMinima"
          :model-value="form.fechaIncidente"
          :disabled="loading"
          :error="errorFecha"
          :helper-text="!errorFecha ? 'Solo fechas de hoy en adelante.' : ''"
          @update:model-value="onFechaInput"
        />

        <div class="space-y-1.5">
          <label
            for="incidente-reemplazo"
            class="block text-xs font-bold uppercase tracking-wider text-slate-700"
          >
            Bus de reemplazo <span class="font-medium normal-case text-slate-400">(opcional)</span>
          </label>
          <div class="relative">
            <select
              id="incidente-reemplazo"
              :value="form.replacementBusNumero"
              :disabled="loading"
              class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 appearance-none pr-10"
              @change="actualizar('replacementBusNumero', valorDeSelect($event))"
            >
              <option value="">Sin bus de reemplazo</option>
              <option
                v-for="reemplazo in busesReemplazo"
                :key="reemplazo.numero"
                :value="reemplazo.numero"
              >
                {{ reemplazo.numero }} · {{ reemplazo.placa }}
              </option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <p class="text-[11px] text-slate-400">Buses activos disponibles para operar.</p>
        </div>
      </div>

      <!-- Motivo del incidente -->
      <fieldset class="space-y-1.5">
        <div class="flex items-center justify-between">
          <legend class="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Motivo del incidente <span class="text-red-500" aria-hidden="true">*</span>
          </legend>
          <span v-if="errorMotivo" class="text-xs font-bold text-red-500">
            ⚠️ {{ errorMotivo }}
          </span>
        </div>

        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-required="true">
          <label
            v-for="opcion in motivos"
            :key="opcion.value"
            :for="`incidente-motivo-${opcion.value}`"
            class="flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all cursor-pointer select-none text-xs"
            :class="[
              form.motivo === opcion.value
                ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-2 ring-blue-100'
                : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700',
              loading ? 'cursor-not-allowed opacity-60' : '',
            ]"
          >
            <input
              :id="`incidente-motivo-${opcion.value}`"
              type="radio"
              name="motivo-incidente"
              class="h-4 w-4 shrink-0 accent-blue-600 cursor-pointer"
              :value="opcion.value"
              :checked="form.motivo === opcion.value"
              :disabled="loading"
              @change="onMotivoChange(opcion.value)"
            />
            <span class="min-w-0 truncate font-semibold">{{ opcion.label }}</span>
          </label>
        </div>
      </fieldset>

      <!-- Descripción del incidente -->
      <div class="space-y-1">
        <label
          for="incidente-descripcion"
          class="block text-xs font-bold uppercase tracking-wider text-slate-700"
        >
          Descripción del incidente
        </label>
        <textarea
          id="incidente-descripcion"
          :value="form.descripcion"
          rows="2"
          :disabled="loading"
          placeholder="Describe la falla o situación operativa..."
          class="w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          @input="actualizar('descripcion', valorDeTexto($event))"
        ></textarea>
      </div>
    </form>

    <template #footer>
      <ButtonBase variant="secondary" :disabled="loading" @click="cerrarModal">
        Cancelar
      </ButtonBase>
      <ButtonBase
        type="submit"
        form="form-reportar-incidente"
        variant="danger"
        :loading="loading"
      >
        Reportar incidente
      </ButtonBase>
    </template>
  </ModalBase>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import ModalBase from './ModalBase.vue'
import InputBase from './InputBase.vue'
import ButtonBase from './ButtonBase.vue'
import { useIncidenteValidation } from '../Composables/useIncidenteValidation'

interface MotivoOpcion {
  value: string
  label: string
  descripcion?: string
}

interface BusDisponible {
  numero: string
  placa: string
}

interface BusAfectado {
  numero: string
  placa: string
  estado?: string
}

interface FormularioIncidente {
  busNumero: string
  motivo: string
  descripcion: string
  fechaIncidente: string
  replacementBusNumero: string
  reportadoPor: string
}

interface Props {
  modelValue: boolean
  bus: BusAfectado | null
  form: FormularioIncidente
  motivos: MotivoOpcion[]
  busesReemplazo: BusDisponible[]
  loading?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
  (e: 'update:form', patch: Partial<FormularioIncidente>): void
  (e: 'select-motivo', motivo: string): void
  (e: 'submit'): void
}>()

const {
  errorFecha,
  errorMotivo,
  fechaMinima,
  validarFecha,
  validarMotivo,
  validarFormulario,
  resetErrores,
} = useIncidenteValidation()

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) resetErrores()
  },
)

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

type CampoFormulario = keyof FormularioIncidente

function actualizar(campo: CampoFormulario, valor: string) {
  emit('update:form', { [campo]: valor } as Partial<FormularioIncidente>)
}

function onFechaInput(fecha: string) {
  actualizar('fechaIncidente', fecha)
  validarFecha(fecha)
}

function onMotivoChange(motivo: string) {
  actualizar('motivo', motivo)
  validarMotivo(motivo)
  emit('select-motivo', motivo)
}

function onSubmit() {
  if (props.loading) return

  const valida = validarFormulario({
    busNumero: props.form.busNumero,
    motivo: props.form.motivo,
    fechaIncidente: props.form.fechaIncidente,
    descripcion: props.form.descripcion,
  })

  if (!valida) return

  emit('submit')
}

function valorDeTexto(event: Event) {
  return (event.target as HTMLTextAreaElement).value
}

function valorDeSelect(event: Event) {
  return (event.target as HTMLSelectElement).value
}

function cerrarModal() {
  resetErrores()
  emit('update:modelValue', false)
  emit('close')
}
</script>
