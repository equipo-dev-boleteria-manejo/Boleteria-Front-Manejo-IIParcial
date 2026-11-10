<template>
  <ModalBase
    :model-value="modelValue"
    title="Habilitar y programar ruta diaria"
    max-width="lg"
    :close-on-click-outside="!loading"
    @update:model-value="emit('update:modelValue', $event)"
    @close="emit('close')"
  >
    <form id="form-habilitar-ruta" class="space-y-4" novalidate @submit.prevent="onEnviar">
      <!-- Error devuelto por el servidor -->
      <div
        v-if="error"
        role="alert"
        aria-live="assertive"
        class="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700"
      >
        <span aria-hidden="true">⚠️</span>
        <span class="flex-1">{{ error }}</span>
      </div>

      <div
        v-if="choferesError"
        role="alert"
        class="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-medium text-amber-800"
      >
        No se pudieron cargar los choferes: {{ choferesError }}
      </div>

      <!-- Sin frecuencias activas -->
      <div
        v-if="!loading && frecuencias.length === 0"
        role="status"
        class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-xs font-medium text-amber-800"
      >
        <span class="mb-1 block text-2xl" aria-hidden="true">⚠️</span>
        No se encontraron frecuencias activas. Registra o activa una frecuencia antes de programar viajes.
      </div>

      <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <!-- Frecuencia -->
        <div class="space-y-1.5">
          <label for="habilitar-frecuencia" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Frecuencia / Horario <span class="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="habilitar-frecuencia"
            v-model="formulario.frecuenciaId"
            :disabled="loading || frecuencias.length === 0"
            :aria-invalid="Boolean(erroresVisibles.frecuenciaId)"
            :class="[claseSelect, erroresVisibles.frecuenciaId ? 'border-red-400' : 'border-slate-300']"
          >
            <option value="" disabled>Seleccione una frecuencia</option>
            <option v-for="frecuencia in frecuencias" :key="frecuencia.id" :value="frecuencia.id">
              {{ frecuencia.ciudadOrigen }} → {{ frecuencia.ciudadDestino }} ({{ frecuencia.horaSalida }})
            </option>
          </select>
          <p v-if="erroresVisibles.frecuenciaId" role="alert" class="text-[11px] font-semibold text-red-600">
            ⚠️ {{ erroresVisibles.frecuenciaId }}
          </p>
        </div>

        <!-- Fecha -->
        <InputBase
          id="habilitar-fecha"
          v-model="formulario.fecha"
          label="Fecha de viaje"
          type="date"
          required
          :min="fechaMinima()"
          :disabled="loading"
          :error="erroresVisibles.fecha"
        />
      </div>

      <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <!-- Unidad -->
        <div class="space-y-1.5">
          <label for="habilitar-bus" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Unidad / Bus <span class="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="habilitar-bus"
            v-model="formulario.busId"
            :disabled="loading || buses.length === 0"
            :aria-invalid="Boolean(erroresVisibles.busId)"
            :class="[claseSelect, erroresVisibles.busId ? 'border-red-400' : 'border-slate-300']"
          >
            <option value="" disabled>Seleccione una unidad</option>
            <option v-for="bus in buses" :key="bus.id" :value="bus.id">
              Bus #{{ bus.numero }} ({{ bus.placa }}) · {{ bus.totalAsientos }} asientos
            </option>
          </select>
          <p v-if="erroresVisibles.busId" role="alert" class="text-[11px] font-semibold text-red-600">
            ⚠️ {{ erroresVisibles.busId }}
          </p>
          <p v-else-if="buses.length === 0 && !loading" class="text-[11px] font-medium text-amber-600">
            No hay buses activos registrados.
          </p>
        </div>

        <!-- Chofer (opcional) -->
        <div class="space-y-1.5">
          <label for="habilitar-chofer" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Chofer asignado (opcional)
          </label>
          <select
            id="habilitar-chofer"
            v-model="formulario.choferId"
            :disabled="loading || choferesLoading"
            :class="[claseSelect, 'border-slate-300']"
          >
            <option value="">Sin chofer asignado</option>
            <option v-for="chofer in choferes" :key="chofer.id" :value="chofer.id">
              {{ chofer.nombreCompleto }}
            </option>
          </select>
          <p v-if="!choferes.length && !choferesLoading && !choferesError" class="text-[11px] font-medium text-amber-600">
            No hay choferes activos disponibles.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2">
        <InputBase
          id="habilitar-tiempo"
          v-model="formulario.tiempoViajeMinutos"
          label="Tiempo estimado (minutos)"
          type="number"
          min="1"
          step="1"
          placeholder="Se calcula desde las paradas"
          :disabled="loading"
          :error="erroresVisibles.tiempoViajeMinutos"
          helper-text="Si la frecuencia tiene paradas, se usa el tiempo de su última parada."
        />

        <div class="space-y-1 pt-7">
          <label class="inline-flex cursor-pointer select-none items-center gap-2 text-xs font-bold text-slate-700">
            <input
              id="habilitar-directo"
              v-model="formulario.esDirecta"
              type="checkbox"
              :disabled="loading || frecuenciaSeleccionada?.esDirecto"
              class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200 disabled:cursor-not-allowed"
            />
            Servicio directo (sin paradas intermedias)
          </label>
          <p v-if="frecuenciaSeleccionada?.esDirecto" class="text-[11px] text-slate-500">
            Esta frecuencia es directa: no tiene paradas intermedias.
          </p>
          <p v-else-if="frecuenciaSeleccionada" class="text-[11px] text-slate-500">
            Marca esta opción para que, ese día, la ruta salga sin detenerse en las paradas.
          </p>
        </div>
      </div>

      <InputBase
        id="habilitar-observacion"
        v-model="formulario.observacionChofer"
        label="Observaciones de despacho"
        placeholder="Ej. Salida especial por feriado, conductor en relevo..."
        :disabled="loading"
        :error="erroresVisibles.observacionChofer"
      />
    </form>

    <template #footer="{ close }">
      <ButtonBase variant="secondary" size="md" :disabled="loading" @click="close">Cancelar</ButtonBase>
      <ButtonBase
        type="submit"
        form="form-habilitar-ruta"
        variant="primary"
        size="md"
        :loading="loading"
        :disabled="hayErroresVisibles || frecuencias.length === 0 || buses.length === 0"
      >
        Programar ruta
      </ButtonBase>
    </template>
  </ModalBase>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import ModalBase from './ModalBase.vue'
import InputBase from './InputBase.vue'
import ButtonBase from './ButtonBase.vue'
import type { Frecuencia } from '../../Domain/Entities/Frecuencia'
import type { Bus } from '../../Domain/Entities/Bus'
import type { HabilitarRutaInput } from '../../Application/UseCases/HabilitarRutaDiaria'
import { useHabilitarRutaFormValidation } from '../Composables/useHabilitarRutaFormValidation'

interface Props {
  modelValue: boolean
  /** Solo frecuencias activas: son las únicas que se pueden programar. */
  frecuencias?: readonly Frecuencia[]
  /** Solo buses en estado Activo. */
  buses?: readonly Bus[]
  choferes?: { id: string; nombreCompleto: string }[]
  choferesLoading?: boolean
  choferesError?: string | null
  esDiaOperativo: (frecuencia: Frecuencia, fecha: string) => boolean
  loading?: boolean
  error?: string | null
  fechaDefecto?: string
}

const props = withDefaults(defineProps<Props>(), {
  frecuencias: () => [],
  buses: () => [],
  choferes: () => [],
  choferesLoading: false,
  choferesError: null,
  loading: false,
  error: null,
  fechaDefecto: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'habilitar', payload: HabilitarRutaInput): void
  (e: 'close'): void
}>()

// Mismo estilo que los selects de los formularios del equipo (EditarBusModal).
const claseSelect =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'

const { formulario, erroresVisibles, hayErroresVisibles, frecuenciaSeleccionada, fechaMinima, validarTodo, iniciar, aInput } =
  useHabilitarRutaFormValidation({
    frecuencias: () => props.frecuencias,
    esDiaOperativo: (frecuencia, fecha) => props.esDiaOperativo(frecuencia, fecha),
  })

// Cada vez que el modal se abre, el formulario arranca limpio.
watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) iniciar(props.fechaDefecto || undefined)
  },
  { immediate: true },
)

function onEnviar() {
  if (!validarTodo()) return
  emit('habilitar', aInput())
}
</script>
