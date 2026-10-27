<template>
  <ModalBase
    :model-value="modelValue"
    max-width="xl"
    :close-on-click-outside="!loading"
    @update:model-value="emit('update:modelValue', $event)"
    @close="emit('close')"
  >
    <template #header>
      <div>
        <p class="text-[10px] font-bold uppercase tracking-wider text-amber-600">
          Reporte operativo
        </p>
        <h3 class="text-base font-bold text-slate-900">Reportar incidente de bus</h3>
        <p class="text-xs text-slate-500 mt-0.5">
          Registra la avería o retiro del vehículo y consulta el reemplazo sugerido.
        </p>
      </div>
    </template>

    <form
      id="form-reportar-incidente"
      class="space-y-5"
      novalidate
      @submit.prevent="emit('submit')"
    >
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
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-lg text-white shadow-sm shadow-amber-200"
            aria-hidden="true"
          >
            🚌
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-amber-700/70">
              Bus afectado
            </p>
            <p class="text-sm font-bold text-amber-950">
              N.º {{ bus.numero }} · {{ bus.placa }}
            </p>
          </div>
        </div>

        <span
          class="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700"
        >
          Estado actual: {{ estadoLabel }}
        </span>
      </div>

      <p
        class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600"
      >
        <span aria-hidden="true">ℹ️</span>
        Al reportar el incidente, el bus pasará a <strong>Mantenimiento</strong>. La reasignación de
        rutas y pasajeros corresponde al módulo de Rutas y Ventas.
      </p>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InputBase
          id="incidente-bus"
          label="Bus"
          :model-value="form.busNumero"
          disabled
          helper-text="Bus seleccionado desde el catálogo de flota."
        />

        <InputBase
          id="incidente-fecha"
          label="Fecha del incidente"
          type="date"
          :model-value="form.fechaIncidente"
          :disabled="loading"
          @update:model-value="actualizar('fechaIncidente', $event)"
        />
      </div>

      <fieldset class="space-y-2">
        <legend class="block text-xs font-bold uppercase tracking-wider text-slate-600">
          Motivo del incidente
          <span class="text-red-500" aria-hidden="true">*</span>
        </legend>

        <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="radiogroup" aria-required="true">
          <label
            v-for="opcion in motivos"
            :key="opcion.value"
            :for="`incidente-motivo-${opcion.value}`"
            class="flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors"
            :class="[
              form.motivo === opcion.value
                ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-100'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
              loading ? 'cursor-not-allowed opacity-70' : '',
            ]"
          >
            <input
              :id="`incidente-motivo-${opcion.value}`"
              type="radio"
              name="motivo-incidente"
              class="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
              :value="opcion.value"
              :checked="form.motivo === opcion.value"
              :disabled="loading"
              @change="onMotivoChange(opcion.value)"
            />
            <span class="min-w-0">
              <span class="block text-sm font-bold text-slate-800">{{ opcion.label }}</span>
              <span v-if="opcion.descripcion" class="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                {{ opcion.descripcion }}
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <div class="space-y-1.5">
        <label
          for="incidente-descripcion"
          class="block text-xs font-bold uppercase tracking-wider text-slate-600"
        >
          Descripción del incidente
        </label>
        <textarea
          id="incidente-descripcion"
          :value="form.descripcion"
          rows="3"
          :disabled="loading"
          placeholder="Describe lo ocurrido con el mayor detalle posible..."
          class="min-h-[96px] w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          @input="actualizar('descripcion', valorDeTexto($event))"
        ></textarea>
        <p class="text-xs text-slate-500">
          La descripción se completa automáticamente al elegir un motivo y puede editarla.
        </p>
      </div>

      <div class="space-y-1.5">
        <label
          for="incidente-reemplazo"
          class="block text-xs font-bold uppercase tracking-wider text-slate-600"
        >
          Bus de reemplazo <span class="font-medium normal-case text-slate-400">(opcional)</span>
        </label>
        <select
          id="incidente-reemplazo"
          :value="form.replacementBusNumero"
          :disabled="loading"
          class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          @change="actualizar('replacementBusNumero', valorDeSelect($event))"
        >
          <option value="">Sin bus de reemplazo</option>
          <option v-for="reemplazo in busesReemplazo" :key="reemplazo.numero" :value="reemplazo.numero">
            {{ reemplazo.numero }} · {{ reemplazo.placa }}
          </option>
        </select>
        <p class="text-xs text-slate-500">
          Solo se listan buses activos disponibles para operar. El backend valida la asignación.
        </p>
      </div>

      <div class="space-y-1.5">
        <label
          for="incidente-reportado-por"
          class="block text-xs font-bold uppercase tracking-wider text-slate-600"
        >
          Reportado por
        </label>
        <input
          id="incidente-reportado-por"
          :value="form.reportadoPor"
          type="text"
          disabled
          class="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500"
        />
        <p class="text-xs text-slate-500">
          Se registra automáticamente con la sesión activa.
        </p>
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
import { computed } from 'vue'
import ModalBase from './ModalBase.vue'
import InputBase from './InputBase.vue'
import ButtonBase from './ButtonBase.vue'

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

function onMotivoChange(motivo: string) {
  emit('update:form', { motivo })
  emit('select-motivo', motivo)
}

function valorDeTexto(event: Event) {
  return (event.target as HTMLTextAreaElement).value
}

function valorDeSelect(event: Event) {
  return (event.target as HTMLSelectElement).value
}

function cerrarModal() {
  emit('update:modelValue', false)
  emit('close')
}
</script>
