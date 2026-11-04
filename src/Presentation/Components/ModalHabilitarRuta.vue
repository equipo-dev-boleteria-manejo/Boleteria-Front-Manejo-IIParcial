<template>
  <ModalBase
    :model-value="modelValue"
    title="Habilitar y Programar Ruta Diaria"
    max-width="lg"
    @update:model-value="emit('update:modelValue', $event)"
    @close="emit('close')"
  >
    <form id="form-habilitar-ruta" class="space-y-4" @submit.prevent="onEnviar">
      <!-- Estado de Error -->
      <div
        v-if="error"
        role="alert"
        class="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2"
      >
        <span class="text-base">⚠️</span>
        <span class="flex-1">{{ error }}</span>
      </div>

      <!-- Estado Vacío: Sin frecuencias -->
      <div
        v-if="!loading && frecuencias.length === 0"
        role="status"
        class="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium text-center"
      >
        <span class="block text-2xl mb-1">⚠️</span>
        No se encontraron frecuencias activas. Registre frecuencias antes de programar viajes.
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <!-- Selector de Frecuencia -->
        <div class="space-y-1.5">
          <label for="select-frecuencia" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Frecuencia / Horario <span class="text-red-500">*</span>
          </label>
          <select
            id="select-frecuencia"
            v-model="formulario.frecuenciaId"
            required
            :disabled="loading || frecuencias.length === 0"
            class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
            @change="onFrecuenciaChange"
          >
            <option value="" disabled>Seleccione una frecuencia</option>
            <option v-for="f in frecuencias" :key="f.id || f.identificador" :value="f.id">
              {{ f.ciudadOrigen }} → {{ f.ciudadDestino }} ({{ f.horaSalida }})
            </option>
          </select>
        </div>

        <!-- Fecha de Operación -->
        <div class="space-y-1.5">
          <label for="input-fecha-operacion" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Fecha de Viaje <span class="text-red-500">*</span>
          </label>
          <input
            id="input-fecha-operacion"
            v-model="formulario.fecha"
            type="date"
            required
            :min="fechaMinima"
            :disabled="loading"
            class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
            :class="{ 'border-amber-400 bg-amber-50/50': !esDiaValido && formulario.fecha }"
            @change="onFechaChange"
          />
        </div>
      </div>

      <!-- Alerta de Día No Operativo -->
      <div
        v-if="formulario.fecha && !esDiaValido"
        class="p-2.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200 flex items-center gap-2"
      >
        <span>⚠️</span>
        <span>La frecuencia seleccionada normalmente no opera los días {{ nombreDiaSeleccionado }}.</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <!-- Selector de Bus -->
        <div class="space-y-1.5">
          <label for="select-bus" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Unidad / Bus <span class="text-red-500">*</span>
          </label>
          <select
            id="select-bus"
            v-model="formulario.busId"
            required
            :disabled="loading || buses.length === 0"
            class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="" disabled>Seleccione una unidad</option>
            <option v-for="b in buses" :key="b.id || b.numero" :value="b.id">
              Bus #{{ b.numero }} ({{ b.placa }}) - Cap: {{ b.totalAsientos }}
            </option>
          </select>
          <p v-if="buses.length === 0 && !loading" class="text-[11px] text-amber-600 font-medium">
            No hay buses activos registrados.
          </p>
        </div>

        <!-- Selector de Chofer (Opcional) -->
        <div class="space-y-1.5">
          <label for="select-chofer" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Chofer Asignado (Opcional)
          </label>
          <select
            id="select-chofer"
            v-model="formulario.choferId"
            :disabled="loading"
            class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Sin chofer asignado</option>
            <option
              v-for="c in choferes"
              :key="c.cedula || c.id"
              :value="c.cedula || c.id"
            >
              {{ c.nombres }} {{ c.apellidos || '' }} ({{ c.cedula || c.id }})
            </option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
        <!-- Tiempo Estimado de Viaje (Minutos) -->
        <InputBase
          id="input-tiempo-viaje"
          v-model="formulario.tiempoViajeMinutos"
          label="Tiempo Estimado (Minutos)"
          type="number"
          placeholder="Ej. 180"
          :disabled="loading"
          helper-text="Por defecto: 180 minutos (3 horas)."
        />

        <!-- Checkbox Servicio Directo -->
        <div class="pt-5">
          <label class="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
            <input
              id="checkbox-directo"
              v-model="formulario.esDirecta"
              type="checkbox"
              :disabled="loading"
              class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
            />
            <span>Servicio Directo (Sin paradas intermedias)</span>
          </label>
        </div>
      </div>

      <!-- Observación Chofer / Despacho -->
      <InputBase
        id="input-observacion"
        v-model="formulario.observacionChofer"
        label="Observaciones de Despacho"
        placeholder="Ej. Salida especial por feriado, conductor en relevo..."
        :disabled="loading"
      />
    </form>

    <template #footer="{ close }">
      <ButtonBase
        variant="secondary"
        size="md"
        :disabled="loading"
        @click="close"
      >
        Cancelar
      </ButtonBase>
      <ButtonBase
        type="submit"
        form="form-habilitar-ruta"
        variant="primary"
        size="md"
        :loading="loading"
        :disabled="loading || frecuencias.length === 0 || buses.length === 0"
      >
        Programar Ruta
      </ButtonBase>
    </template>
  </ModalBase>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import ModalBase from './ModalBase.vue'
import InputBase from './InputBase.vue'
import ButtonBase from './ButtonBase.vue'
import type { Frecuencia } from '../../Domain/Entities/Frecuencia'
import type { Bus } from '../../Domain/Entities/Bus'
import type { HabilitarRutaInput } from '../../Application/UseCases/HabilitarRutaDiaria'

interface ChoferItem {
  cedula?: string
  id?: string
  nombres: string
  apellidos?: string
}

interface Props {
  modelValue: boolean
  frecuencias?: Frecuencia[]
  buses?: Bus[]
  choferes?: ChoferItem[]
  loading?: boolean
  error?: string | null
  fechaDefecto?: string
}

const props = withDefaults(defineProps<Props>(), {
  frecuencias: () => [],
  buses: () => [],
  choferes: () => [],
  loading: false,
  error: null,
  fechaDefecto: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'habilitar', payload: HabilitarRutaInput): void
  (e: 'close'): void
  (e: 'cambio-fecha', fecha: string): void
}>()

const fechaHoy = new Date().toISOString().slice(0, 10)
const fechaMinima = fechaHoy

function getFormularioInicial() {
  return {
    frecuenciaId: '' as number | '',
    busId: '' as number | '',
    fecha: props.fechaDefecto || fechaHoy,
    choferId: '',
    esDirecta: true,
    tiempoViajeMinutos: 180 as number | '',
    observacionChofer: '',
  }
}

const formulario = reactive(getFormularioInicial())

// Al abrir el modal, reiniciar con valores limpios
watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) {
      Object.assign(formulario, getFormularioInicial())
    }
  }
)

const selectedFrecuencia = computed(() => {
  if (!formulario.frecuenciaId) return null
  return props.frecuencias.find((f) => f.id === Number(formulario.frecuenciaId)) || null
})

const nombreDiaSeleccionado = computed(() => {
  if (!formulario.fecha) return ''
  const d = new Date(formulario.fecha + 'T12:00:00')
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return dias[d.getDay()] || ''
})

const esDiaValido = computed(() => {
  const f = selectedFrecuencia.value
  if (!formulario.fecha || !f || !f.diasOperacion || f.diasOperacion.length === 0) {
    return true
  }
  const diaNorm = nombreDiaSeleccionado.value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  return f.diasOperacion.some((d: string) => {
    const dNorm = d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return dNorm === diaNorm
  })
})

function onFrecuenciaChange() {
  const f = selectedFrecuencia.value
  if (f) {
    formulario.esDirecta = f.esDirecto
  }
}

function onFechaChange() {
  emit('cambio-fecha', formulario.fecha)
}

function onEnviar() {
  if (!formulario.frecuenciaId || !formulario.busId || !formulario.fecha) return

  const payload: HabilitarRutaInput = {
    frecuenciaId: Number(formulario.frecuenciaId),
    busId: Number(formulario.busId),
    fecha: formulario.fecha,
    choferId: formulario.choferId || undefined,
    esDirecta: formulario.esDirecta,
    horaSalida: selectedFrecuencia.value?.horaSalida || undefined,
    observacionChofer: formulario.observacionChofer || undefined,
    tiempoViajeMinutos: formulario.tiempoViajeMinutos
      ? Number(formulario.tiempoViajeMinutos)
      : 180,
  }

  emit('habilitar', payload)
}
</script>
