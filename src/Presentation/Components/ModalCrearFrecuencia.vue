<template>
  <ModalBase
    :model-value="modelValue"
    :title="esEdicion ? 'Editar frecuencia' : 'Registrar nueva frecuencia'"
    max-width="2xl"
    :close-on-click-outside="!loading"
    @update:model-value="emit('update:modelValue', $event)"
    @close="emit('close')"
  >
    <form id="form-frecuencia" class="space-y-4" novalidate @submit.prevent="enviar">
      <div
        v-if="error"
        role="alert"
        aria-live="assertive"
        class="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700"
      >
        <span aria-hidden="true">⚠️</span>
        <span>{{ error }}</span>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <!-- Cooperativa vinculada a la sesión (o a la frecuencia que se edita) -->
        <div
          v-if="cooperativaMostrada !== null"
          class="flex flex-col justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs sm:col-span-2 sm:flex-row sm:items-center"
        >
          <div class="flex items-center gap-2 font-semibold text-blue-900">
            <span>🏢 Cooperativa asignada:</span>
            <span class="font-bold text-blue-700">Cooperativa N.º {{ cooperativaMostrada }}</span>
          </div>
          <span
            class="self-start rounded-md border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-blue-600 sm:self-auto"
          >
            {{ esEdicion ? 'No modificable' : 'Vinculación automática por sesión' }}
          </span>
        </div>

        <InputBase
          v-else
          id="frecuencia-cooperativa"
          v-model="formulario.cooperativaId"
          label="ID de la cooperativa"
          type="number"
          min="1"
          step="1"
          required
          :disabled="loading"
          :error="erroresVisibles.cooperativaId"
          container-class="sm:col-span-2"
          helper-text="Tu usuario no está asociado a una cooperativa: indica a cuál pertenece la frecuencia."
        />

        <InputBase
          id="frecuencia-origen"
          v-model="formulario.ciudadOrigen"
          label="Ciudad de origen"
          placeholder="Ej. Quito"
          required
          :disabled="loading"
          :error="erroresVisibles.ciudadOrigen"
        />

        <InputBase
          id="frecuencia-destino"
          v-model="formulario.ciudadDestino"
          label="Ciudad de destino"
          placeholder="Ej. Cuenca"
          required
          :disabled="loading"
          :error="erroresVisibles.ciudadDestino"
        />

        <InputBase
          id="frecuencia-hora"
          v-model="formulario.horaSalida"
          label="Hora de salida"
          type="time"
          required
          :disabled="loading"
          :error="erroresVisibles.horaSalida"
          helper-text="Hora aprobada de salida (formato de 24 horas)."
        />

        <InputBase
          id="frecuencia-identificador"
          v-model="formulario.identificadorFrecuencia"
          label="Identificador de frecuencia"
          placeholder="Ej. FR-001"
          required
          :disabled="loading || esEdicion"
          :error="erroresVisibles.identificadorFrecuencia"
          :helper-text="esEdicion ? 'El identificador no se puede modificar.' : 'Debe ser único dentro de la cooperativa.'"
        />

        <InputBase
          id="frecuencia-codigo-ant"
          v-model="formulario.codigoAnt"
          label="Código ANT"
          placeholder="Opcional"
          :disabled="loading"
          :error="erroresVisibles.codigoAnt"
        />

        <InputBase
          id="frecuencia-resolucion-ant"
          v-model="formulario.resolucionAnt"
          label="Resolución ANT"
          placeholder="Opcional"
          :disabled="loading"
          :error="erroresVisibles.resolucionAnt"
        />

        <fieldset class="space-y-2 sm:col-span-2">
          <legend class="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Días de operación <span class="text-red-500" aria-hidden="true">*</span>
          </legend>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label
              v-for="opcion in OPCIONES_DIAS"
              :key="opcion.valor"
              class="inline-flex cursor-pointer items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
              :class="erroresVisibles.diasOperacion ? 'border-red-300' : 'border-slate-300'"
            >
              <input
                v-model="formulario.diasOperacion"
                type="checkbox"
                :value="opcion.valor"
                :disabled="loading"
                class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
              />
              {{ opcion.etiqueta }}
            </label>
          </div>
          <p v-if="erroresVisibles.diasOperacion" role="alert" class="text-[11px] font-semibold text-red-600">
            {{ erroresVisibles.diasOperacion }}
          </p>
          <p v-else class="text-[11px] text-slate-400">Días de la semana en los que opera la frecuencia.</p>
        </fieldset>

        <div class="space-y-1 sm:col-span-2">
          <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
            <input
              v-model="formulario.esDirecto"
              type="checkbox"
              :disabled="loading"
              class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
            />
            Servicio directo
          </label>
          <p v-if="mensajeDirecto" role="status" class="text-[11px] font-semibold text-amber-600">
            ⚠️ {{ mensajeDirecto }}
          </p>
          <p v-else class="text-[11px] text-slate-400">
            Una frecuencia directa no lleva paradas intermedias. Desmárcalo si quieres agregarlas.
          </p>
        </div>
      </div>
    </form>

    <template #footer>
      <ButtonBase variant="secondary" :disabled="loading" @click="emit('update:modelValue', false)">
        Cancelar
      </ButtonBase>
      <ButtonBase type="submit" form="form-frecuencia" :loading="loading" :disabled="hayErroresVisibles">
        {{ esEdicion ? 'Guardar cambios' : 'Registrar frecuencia' }}
      </ButtonBase>
    </template>
  </ModalBase>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import ModalBase from './ModalBase.vue'
import InputBase from './InputBase.vue'
import ButtonBase from './ButtonBase.vue'
import type { ActualizarFrecuenciaDto, CrearFrecuenciaDto } from '../../Application/Dtos/CrearFrecuenciaDto'
import { OPCIONES_DIAS, type DatosEdicionFrecuencia } from '../Composables/presentacionFrecuencias'
import { useFrecuenciaFormValidation } from '../Composables/useFrecuenciaFormValidation'

interface Props {
  modelValue: boolean
  loading?: boolean
  error?: string | null
  /** Cooperativa del usuario autenticado; si no existe, se pide en el formulario. */
  cooperativaId?: number | null
  /** Si se indica, el modal funciona en modo edición con estos datos precargados. */
  frecuencia?: DatosEdicionFrecuencia | null
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  cooperativaId: null,
  frecuencia: null,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
  (e: 'submit', dto: CrearFrecuenciaDto): void
  (e: 'guardar', cambios: ActualizarFrecuenciaDto): void
  (e: 'sinCambios'): void
}>()

const esEdicion = computed(() => props.frecuencia !== null)
const cooperativaMostrada = computed<number | null>(
  () => props.frecuencia?.cooperativaId ?? props.cooperativaId ?? null,
)

const { formulario, erroresVisibles, hayErroresVisibles, hayCambios, mensajeDirecto, validarTodo, iniciar, aDto, aCambios } =
  useFrecuenciaFormValidation(() => cooperativaMostrada.value === null)

// Cada vez que el modal se abre, el formulario arranca limpio (crear) o precargado (editar).
watch(
  () => [props.modelValue, props.frecuencia] as const,
  ([abierto, frecuencia]) => {
    if (abierto) iniciar(frecuencia ?? undefined)
  },
  { immediate: true },
)

function enviar() {
  if (!validarTodo()) return

  if (esEdicion.value) {
    if (hayCambios.value) emit('guardar', aCambios())
    else emit('sinCambios')
    return
  }
  emit('submit', aDto(cooperativaMostrada.value ?? Number(formulario.cooperativaId)))
}
</script>
