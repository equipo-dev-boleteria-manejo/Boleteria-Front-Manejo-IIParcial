<template>
  <ModalBase
    :model-value="modelValue"
    title="Registrar nueva frecuencia"
    max-width="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form id="form-crear-frecuencia" class="space-y-4" @submit.prevent="enviar">
      <div
        v-if="error"
        class="p-3.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200"
        role="alert"
      >
        {{ error }}
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputBase v-model="formulario.ciudadOrigen" label="Ciudad de origen" required placeholder="Ej. Quito" />
        <InputBase v-model="formulario.ciudadDestino" label="Ciudad de destino" required placeholder="Ej. Cuenca" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputBase v-model="formulario.horaSalida" label="Hora de salida" type="time" required />
        <InputBase
          v-model="formulario.identificadorFrecuencia"
          label="Identificador de frecuencia"
          required
          placeholder="Ej. FR-001"
          helper-text="Debe ser único dentro de la cooperativa."
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputBase v-model="formulario.codigoAnt" label="Código ANT" placeholder="Opcional" />
        <InputBase v-model="formulario.resolucionAnt" label="Resolución ANT" placeholder="Opcional" />
      </div>

      <InputBase
        v-if="cooperativaId === null || cooperativaId === undefined"
        v-model="formulario.cooperativaId"
        label="ID de la cooperativa"
        type="number"
        required
        helper-text="Tu usuario no está asociado a una cooperativa: indica a cuál pertenece la frecuencia."
      />

      <fieldset class="space-y-2">
        <legend class="block text-xs font-bold uppercase tracking-wider text-slate-600">Días de operación</legend>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <label
            v-for="opcion in OPCIONES_DIAS"
            :key="opcion.valor"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50"
          >
            <input
              v-model="formulario.diasOperacion"
              type="checkbox"
              :value="opcion.valor"
              class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
            />
            {{ opcion.etiqueta }}
          </label>
        </div>
      </fieldset>

      <label class="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
        <input
          v-model="formulario.esDirecto"
          type="checkbox"
          class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
        />
        Servicio directo
      </label>
    </form>

    <template #footer="{ close }">
      <ButtonBase variant="secondary" size="md" :disabled="loading" @click="close">Cancelar</ButtonBase>
      <ButtonBase type="submit" form="form-crear-frecuencia" variant="primary" size="md" :loading="loading">
        Registrar frecuencia
      </ButtonBase>
    </template>
  </ModalBase>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import ModalBase from './ModalBase.vue'
import InputBase from './InputBase.vue'
import ButtonBase from './ButtonBase.vue'
import type { CrearFrecuenciaDto } from '../../Application/Dtos/CrearFrecuenciaDto'
import type { DiaOperacion } from '../../Domain/Entities/Frecuencia'
import { OPCIONES_DIAS } from '../Composables/presentacionFrecuencias'

interface Props {
  modelValue: boolean
  loading?: boolean
  error?: string | null
  /** Cooperativa del usuario autenticado; si no existe, se pide en el formulario. */
  cooperativaId?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  cooperativaId: null,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', dto: CrearFrecuenciaDto): void
}>()

function formularioInicial() {
  return {
    ciudadOrigen: '',
    ciudadDestino: '',
    horaSalida: '',
    identificadorFrecuencia: '',
    codigoAnt: '',
    resolucionAnt: '',
    cooperativaId: '',
    esDirecto: true,
    diasOperacion: OPCIONES_DIAS.map((opcion) => opcion.valor) as DiaOperacion[],
  }
}

const formulario = reactive(formularioInicial())

// Cada vez que el modal se abre, el formulario arranca limpio.
watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) Object.assign(formulario, formularioInicial())
  },
)

function enviar() {
  emit('submit', {
    cooperativaId: props.cooperativaId ?? Number(formulario.cooperativaId),
    ciudadOrigen: formulario.ciudadOrigen,
    ciudadDestino: formulario.ciudadDestino,
    horaSalida: formulario.horaSalida,
    identificadorFrecuencia: formulario.identificadorFrecuencia,
    esDirecto: formulario.esDirecto,
    diasOperacion: [...formulario.diasOperacion],
    codigoAnt: formulario.codigoAnt,
    resolucionAnt: formulario.resolucionAnt,
  })
}
</script>
