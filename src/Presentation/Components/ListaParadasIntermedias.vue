<template>
  <section class="space-y-5" aria-label="Paradas intermedias de la frecuencia">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-black text-slate-900">Paradas intermedias</h3>
        <p class="text-xs text-slate-500 mt-0.5">
          Ordenadas desde el origen. El tiempo se cuenta desde la hora de salida.
        </p>
      </div>
      <span
        class="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border bg-slate-50 text-slate-600 border-slate-200"
      >
        {{ paradas.length }} {{ paradas.length === 1 ? 'parada' : 'paradas' }}
      </span>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2"
      role="alert"
    >
      <span>⚠️</span>
      <span>{{ error }}</span>
    </div>

    <!-- Vacío -->
    <div
      v-if="paradas.length === 0"
      class="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center space-y-1"
    >
      <div class="text-3xl text-slate-300" aria-hidden="true">📍</div>
      <h4 class="text-sm font-black text-slate-800">Esta frecuencia no tiene paradas intermedias</h4>
      <p class="text-xs text-slate-500">Agrega la primera parada con el formulario de abajo.</p>
    </div>

    <!-- Datos -->
    <div v-else class="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto" :aria-busy="loading">
        <table
          class="w-full text-left text-sm border-collapse"
          :class="loading ? 'opacity-60' : ''"
          aria-label="Lista de paradas intermedias"
        >
          <thead class="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-600 tracking-wider">
            <tr>
              <th scope="col" class="px-5 py-3">Orden</th>
              <th scope="col" class="px-5 py-3">Ciudad</th>
              <th scope="col" class="px-5 py-3">Tiempo desde origen</th>
              <th scope="col" class="px-5 py-3 text-center">Venta</th>
              <th scope="col" class="px-5 py-3">Costo prop.</th>
              <th scope="col" class="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
            <tr v-for="parada in paradas" :key="parada.id" class="hover:bg-blue-50/50 transition-colors">
              <td class="px-5 py-3">
                <span
                  class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-black text-xs ring-1 ring-slate-200"
                >
                  {{ parada.orden }}
                </span>
              </td>
              <td class="px-5 py-3 font-bold text-slate-900 text-sm">{{ parada.ciudad }}</td>
              <td class="px-5 py-3">{{ parada.tiempo }}</td>
              <td class="px-5 py-3 text-center">
                <span
                  class="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border"
                  :class="
                    parada.permiteVenta
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  "
                >
                  {{ parada.permiteVenta ? 'Permite venta' : 'Sin venta' }}
                </span>
              </td>
              <td class="px-5 py-3 font-mono">{{ parada.costo }}</td>
              <td class="px-5 py-3 text-right">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="loading"
                  :aria-label="`Eliminar la parada ${parada.ciudad}`"
                  @click="emit('eliminar', parada.id)"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Formulario para agregar una parada -->
    <form class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-4" @submit.prevent="enviar">
      <h4 class="text-xs font-black uppercase tracking-wider text-slate-600">Agregar parada</h4>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <InputBase v-model="formulario.ciudad" label="Ciudad" required placeholder="Ej. Latacunga" />
        <InputBase v-model="formulario.orden" label="Orden" type="number" required />
        <InputBase
          v-model="formulario.minutosDesdeOrigen"
          label="Minutos desde origen"
          type="number"
          required
          placeholder="Ej. 120"
        />
        <InputBase
          v-model="formulario.costoProporcional"
          label="Costo proporcional"
          type="number"
          placeholder="0.00"
        />
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <label class="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
          <input
            v-model="formulario.permiteVenta"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
          />
          Permite venta de pasajes en esta parada
        </label>

        <ButtonBase type="submit" variant="primary" size="md" :loading="loading">+ Agregar parada</ButtonBase>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import InputBase from './InputBase.vue'
import ButtonBase from './ButtonBase.vue'
import type { ParadaIntermediaDto } from '../../Application/Dtos/CrearFrecuenciaDto'
import type { FilaParada } from '../Composables/presentacionFrecuencias'

interface Props {
  paradas: readonly FilaParada[]
  ordenSugerido?: number
  loading?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  ordenSugerido: 1,
  loading: false,
  error: null,
})

const emit = defineEmits<{
  (e: 'agregar', dto: ParadaIntermediaDto): void
  (e: 'eliminar', paradaId: number): void
}>()

const formulario = reactive({
  ciudad: '',
  orden: String(props.ordenSugerido),
  minutosDesdeOrigen: '',
  costoProporcional: '',
  permiteVenta: true,
})

let enviando = false

function limpiarFormulario() {
  formulario.ciudad = ''
  formulario.minutosDesdeOrigen = ''
  formulario.costoProporcional = ''
  formulario.permiteVenta = true
  formulario.orden = String(props.ordenSugerido)
}

function enviar() {
  enviando = true
  emit('agregar', {
    ciudad: formulario.ciudad,
    orden: Number(formulario.orden),
    minutosDesdeOrigen: Number(formulario.minutosDesdeOrigen),
    permiteVenta: formulario.permiteVenta,
    costoProporcional: formulario.costoProporcional === '' ? 0 : Number(formulario.costoProporcional),
  })
}

// El orden sugerido cambia cuando la lista se actualiza (agregar o eliminar una parada).
watch(
  () => props.ordenSugerido,
  (orden) => {
    formulario.orden = String(orden)
  },
)

// Al terminar de guardar sin error se limpia el formulario; si falló, se conservan los datos.
watch(
  () => props.loading,
  (cargando, estabaCargando) => {
    if (estabaCargando && !cargando && enviando) {
      enviando = false
      if (!props.error) limpiarFormulario()
    }
  },
)
</script>
