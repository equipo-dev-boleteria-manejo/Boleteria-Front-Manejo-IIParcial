<template>
  <div class="space-y-6">
    <!-- Encabezado principal y acciones -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm"
    >
      <div>
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">Frecuencias y Paradas ANT</h1>
        <p class="text-xs text-slate-500 mt-1">
          Plantillas maestras de horarios, días de operación y paradas intermedias de cada cooperativa.
        </p>
      </div>
      <div>
        <ButtonBase variant="primary" size="md" @click="abrirModal">+ Nueva frecuencia</ButtonBase>
      </div>
    </div>

    <!-- Banner de éxito -->
    <div
      v-if="mensajeExito"
      class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between"
      role="status"
    >
      <div class="flex items-center gap-2">
        <span>✅</span>
        <span>{{ mensajeExito }}</span>
      </div>
      <button type="button" class="text-emerald-600 hover:text-emerald-900 font-bold" aria-label="Cerrar mensaje" @click="mensajeExito = null">
        ✕
      </button>
    </div>

    <!-- Banner de error -->
    <div
      v-if="errorGeneral"
      class="p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-center justify-between"
      role="alert"
    >
      <div class="flex items-center gap-2">
        <span>⚠️</span>
        <span>{{ errorGeneral }}</span>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class="underline font-bold text-red-700" @click="recargar">Reintentar</button>
        <button type="button" class="text-red-500 hover:text-red-800 font-bold ml-2" aria-label="Cerrar error" @click="limpiarError">
          ✕
        </button>
      </div>
    </div>

    <!-- Búsqueda por tramo -->
    <form
      class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-end gap-4"
      aria-label="Buscar frecuencias por tramo"
      @submit.prevent="buscar"
    >
      <InputBase v-model="origen" label="Origen" placeholder="Ej. Quito" container-class="w-full md:w-64" />
      <InputBase v-model="destino" label="Destino" placeholder="Ej. Cuenca" container-class="w-full md:w-64" />
      <div class="flex items-center gap-2">
        <ButtonBase type="submit" variant="primary" size="md" :disabled="!origen || !destino">Buscar</ButtonBase>
        <ButtonBase variant="outline" size="md" @click="limpiarBusqueda">Ver todas</ButtonBase>
      </div>
    </form>

    <!-- Estado 1: CARGANDO -->
    <div
      v-if="loading && filasFrecuencias.length === 0"
      class="rounded-2xl bg-white border border-slate-200 p-12 text-center shadow-sm space-y-4"
      aria-busy="true"
    >
      <div class="animate-spin h-8 w-8 text-blue-600 mx-auto">
        <svg class="w-full h-full" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
      <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Consultando frecuencias...</p>
    </div>

    <!-- Estado 2: VACÍO -->
    <div
      v-else-if="filasFrecuencias.length === 0 && !errorGeneral"
      class="rounded-2xl bg-white border border-slate-200 p-16 text-center shadow-sm space-y-3"
    >
      <div class="text-4xl text-slate-300" aria-hidden="true">⏱️</div>
      <h3 class="text-base font-black text-slate-800">No se encontraron frecuencias</h3>
      <p class="text-xs text-slate-500 max-w-sm mx-auto">
        Aún no hay frecuencias registradas o ninguna coincide con el tramo buscado.
      </p>
      <div class="pt-2 flex items-center justify-center gap-2">
        <ButtonBase variant="outline" size="sm" @click="limpiarBusqueda">Ver todas</ButtonBase>
        <ButtonBase variant="primary" size="sm" @click="abrirModal">Registrar la primera</ButtonBase>
      </div>
    </div>

    <!-- Estado 3: TABLA DE DATOS -->
    <div
      v-else-if="filasFrecuencias.length > 0"
      class="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden"
    >
      <div class="overflow-x-auto" :aria-busy="loading">
        <table
          class="w-full text-left text-sm border-collapse"
          :class="loading ? 'opacity-60' : ''"
          aria-label="Lista de frecuencias"
        >
          <thead class="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-600 tracking-wider">
            <tr>
              <th scope="col" class="px-6 py-4">Frecuencia</th>
              <th scope="col" class="px-6 py-4">Ruta</th>
              <th scope="col" class="px-6 py-4">Salida</th>
              <th scope="col" class="px-6 py-4">Días</th>
              <th scope="col" class="px-6 py-4">Paradas</th>
              <th scope="col" class="px-6 py-4 text-center">Estado</th>
              <th scope="col" class="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
            <tr
              v-for="fila in filasFrecuencias"
              :key="fila.id"
              class="hover:bg-blue-50/50 transition-colors"
              :class="filaSeleccionada?.id === fila.id ? 'bg-blue-50/60' : ''"
            >
              <td class="px-6 py-4">
                <div class="font-bold text-slate-900 text-sm">{{ fila.identificador }}</div>
                <div class="text-slate-400 text-xs">ANT: {{ fila.codigoAnt }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="font-bold text-slate-900">{{ fila.ruta }}</div>
                <span
                  class="inline-block mt-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200"
                >
                  {{ fila.tipo }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span class="font-mono text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/80 inline-block">
                  {{ fila.horaSalida }}
                </span>
              </td>
              <td class="px-6 py-4">{{ fila.dias }}</td>
              <td class="px-6 py-4">
                <div class="font-bold text-slate-900">{{ fila.totalParadas }}</div>
                <div class="text-slate-400 text-xs">Hasta la última: {{ fila.tiempoUltimaParada }}</div>
              </td>
              <td class="px-6 py-4 text-center">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                  :class="
                    fila.activa
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                  "
                  :title="fila.activa ? 'Clic para desactivar' : 'Clic para activar'"
                  :aria-label="`${fila.activa ? 'Desactivar' : 'Activar'} la frecuencia ${fila.identificador}`"
                  @click="cambiarEstado(fila)"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="fila.activa ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                  <span>{{ fila.activa ? 'Activa' : 'Inactiva' }}</span>
                </button>
              </td>
              <td class="px-6 py-4 text-right">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all cursor-pointer"
                  :aria-label="`Ver las paradas de la frecuencia ${fila.identificador}`"
                  @click="verParadas(fila.id)"
                >
                  Ver paradas
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detalle: paradas de la frecuencia seleccionada -->
    <CardBase v-if="filaSeleccionada" padding="lg">
      <template #header>
        <div>
          <h2 class="text-base font-black text-slate-900">{{ filaSeleccionada.ruta }}</h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Frecuencia {{ filaSeleccionada.identificador }} · salida {{ filaSeleccionada.horaSalida }}
          </p>
        </div>
      </template>
      <template #header-action>
        <ButtonBase variant="ghost" size="sm" @click="limpiarSeleccion">Cerrar detalle</ButtonBase>
      </template>

      <ListaParadasIntermedias
        :paradas="paradasSeleccionadas"
        :orden-sugerido="ordenSugeridoParada"
        :loading="loading"
        :error="errorParadas"
        @agregar="agregarParada"
        @eliminar="eliminarParada"
      />
    </CardBase>

    <!-- Modal: registrar frecuencia -->
    <ModalCrearFrecuencia
      v-model="modalAbierto"
      :loading="loading"
      :error="error"
      :cooperativa-id="cooperativaId"
      @submit="registrar"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ButtonBase from '../../Components/ButtonBase.vue'
import CardBase from '../../Components/CardBase.vue'
import InputBase from '../../Components/InputBase.vue'
import ListaParadasIntermedias from '../../Components/ListaParadasIntermedias.vue'
import ModalCrearFrecuencia from '../../Components/ModalCrearFrecuencia.vue'
import { useFrecuencias, type FilaFrecuencia } from '../../Composables/useFrecuencias'
import { useAuthStore } from '../../Store/authStore'
import { useUiStore } from '../../Store/uiStore'
import type { CrearFrecuenciaDto, ParadaIntermediaDto } from '../../../Application/Dtos/CrearFrecuenciaDto'

const {
  loading,
  error,
  filasFrecuencias,
  filaSeleccionada,
  paradasSeleccionadas,
  ordenSugeridoParada,
  cargarFrecuencias,
  buscarPorTramo,
  seleccionarFrecuencia,
  limpiarSeleccion,
  registrarFrecuencia,
  activarFrecuencia,
  desactivarFrecuencia,
  agregarParadaAFrecuencia,
  eliminarParada: eliminarParadaDeFrecuencia,
  limpiarError,
} = useFrecuencias()

const authStore = useAuthStore()
const uiStore = useUiStore()

const cooperativaId = computed(() => authStore.user?.cooperativaId ?? null)

const origen = ref('')
const destino = ref('')
const modalAbierto = ref(false)
const mensajeExito = ref<string | null>(null)
const errorParadas = ref<string | null>(null)

// El composable ya expone el error; aquí solo se decide dónde mostrarlo para no duplicarlo.
const errorGeneral = computed(() => (modalAbierto.value || errorParadas.value ? null : error.value))

/** El composable guarda el mensaje en `error`; la vista no necesita relanzar la excepción. */
async function ignorandoError(accion: () => Promise<unknown>): Promise<boolean> {
  try {
    await accion()
    return true
  } catch {
    return false
  }
}

function recargar() {
  mensajeExito.value = null
  return ignorandoError(() => cargarFrecuencias())
}

function abrirModal() {
  limpiarError()
  modalAbierto.value = true
}

async function registrar(dto: CrearFrecuenciaDto) {
  const registrada = await ignorandoError(() => registrarFrecuencia(dto))
  if (registrada) {
    modalAbierto.value = false
    mensajeExito.value = `Frecuencia ${dto.identificadorFrecuencia} registrada correctamente.`
  }
}

function buscar() {
  mensajeExito.value = null
  return ignorandoError(() => buscarPorTramo(origen.value.trim(), destino.value.trim()))
}

function limpiarBusqueda() {
  origen.value = ''
  destino.value = ''
  return recargar()
}

function verParadas(id: number) {
  errorParadas.value = null
  return ignorandoError(() => seleccionarFrecuencia(id))
}

async function cambiarEstado(fila: FilaFrecuencia) {
  const activar = !fila.activa
  const confirmado = await uiStore.showConfirm({
    title: activar ? 'Activar frecuencia' : 'Desactivar frecuencia',
    message: activar
      ? `La frecuencia ${fila.identificador} volverá a estar disponible.`
      : `La frecuencia ${fila.identificador} dejará de estar disponible para nuevas programaciones.`,
    type: activar ? 'info' : 'warning',
    confirmText: activar ? 'Activar' : 'Desactivar',
  })
  if (!confirmado) return

  const cambiada = await ignorandoError(() =>
    activar ? activarFrecuencia(fila.id) : desactivarFrecuencia(fila.id),
  )
  if (cambiada) {
    mensajeExito.value = `Frecuencia ${fila.identificador} ${activar ? 'activada' : 'desactivada'}.`
  }
}

async function agregarParada(dto: ParadaIntermediaDto) {
  if (!filaSeleccionada.value) return
  errorParadas.value = null
  const frecuenciaId = filaSeleccionada.value.id
  const agregada = await ignorandoError(() => agregarParadaAFrecuencia(frecuenciaId, dto))
  if (!agregada) errorParadas.value = error.value
}

async function eliminarParada(paradaId: number) {
  const confirmado = await uiStore.showConfirm({
    title: 'Eliminar parada',
    message: 'La parada se quitará de la frecuencia. Esta acción no se puede deshacer.',
    type: 'warning',
    confirmText: 'Eliminar',
  })
  if (!confirmado) return

  errorParadas.value = null
  const eliminada = await ignorandoError(() => eliminarParadaDeFrecuencia(paradaId))
  if (!eliminada) errorParadas.value = error.value
}

onMounted(() => {
  void recargar()
})
</script>
