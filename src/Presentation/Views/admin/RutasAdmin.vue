<template>
  <div class="space-y-6">
    <!-- Encabezado con CardBase -->
    <CardBase
      title="Programación de Rutas Diarias"
      subtitle="Control operativo de viajes, asignación de buses y gestión de estados de despacho"
      padding="lg"
    >
      <template #header-action>
        <div class="flex items-center gap-2">
          <ButtonBase
            variant="secondary"
            size="sm"
            :disabled="loading"
            @click="recargarDatos"
          >
            <span>🔄</span>
            <span>Actualizar</span>
          </ButtonBase>
          <ButtonBase
            variant="primary"
            size="sm"
            @click="abrirModalHabilitar"
          >
            <span>➕</span>
            <span>Programar Ruta</span>
          </ButtonBase>
        </div>
      </template>

      <!-- KPI / Resumen de Estados Clicables -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <button
          type="button"
          class="rounded-xl border p-4 text-left transition-all active:scale-95 cursor-pointer"
          :class="filtroEstado === 'Todas' ? 'border-blue-500 bg-blue-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'"
          @click="filtroEstado = 'Todas'"
        >
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Todas las Rutas</p>
          <p class="text-2xl font-black text-slate-900 mt-1">{{ rutas.length }}</p>
        </button>

        <button
          type="button"
          class="rounded-xl border p-4 text-left transition-all active:scale-95 cursor-pointer"
          :class="filtroEstado === EstadoRuta.PROGRAMADA ? 'border-blue-500 bg-blue-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'"
          @click="filtroEstado = EstadoRuta.PROGRAMADA"
        >
          <p class="text-[10px] font-bold uppercase tracking-wider text-blue-600">Programadas</p>
          <p class="text-2xl font-black text-blue-700 mt-1">{{ conteoProgramadas }}</p>
        </button>

        <button
          type="button"
          class="rounded-xl border p-4 text-left transition-all active:scale-95 cursor-pointer"
          :class="filtroEstado === EstadoRuta.EN_CURSO ? 'border-amber-500 bg-amber-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'"
          @click="filtroEstado = EstadoRuta.EN_CURSO"
        >
          <p class="text-[10px] font-bold uppercase tracking-wider text-amber-600">En Curso</p>
          <p class="text-2xl font-black text-amber-700 mt-1">{{ conteoEnCurso }}</p>
        </button>

        <button
          type="button"
          class="rounded-xl border p-4 text-left transition-all active:scale-95 cursor-pointer"
          :class="filtroEstado === EstadoRuta.FINALIZADA ? 'border-emerald-500 bg-emerald-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'"
          @click="filtroEstado = EstadoRuta.FINALIZADA"
        >
          <p class="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Finalizadas</p>
          <p class="text-2xl font-black text-emerald-700 mt-1">{{ conteoFinalizadas }}</p>
        </button>
      </div>
    </CardBase>

    <!-- Barra de Filtros -->
    <div class="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      <div class="flex flex-1 flex-col sm:flex-row gap-3">
        <!-- Búsqueda por texto -->
        <div class="flex-1">
          <InputBase
            id="filtro-texto"
            v-model="filtroTexto"
            placeholder="Buscar por origen, destino o bus..."
          >
            <template #prefix>
              <span>🔍</span>
            </template>
          </InputBase>
        </div>

        <!-- Filtro por fecha -->
        <div class="w-full sm:w-48">
          <input
            id="filtro-fecha"
            v-model="filtroFecha"
            type="date"
            class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            title="Filtrar por fecha operativa"
          />
        </div>
      </div>

      <!-- Limpiar Filtros -->
      <div v-if="filtroTexto || filtroFecha || filtroEstado !== 'Todas'" class="flex items-center">
        <ButtonBase
          variant="ghost"
          size="sm"
          @click="limpiarFiltros"
        >
          Limpiar filtros
        </ButtonBase>
      </div>
    </div>

    <!-- 1. Estado de Error -->
    <div
      v-if="error"
      role="alert"
      class="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center justify-between gap-3"
    >
      <div class="flex items-center gap-2">
        <span class="text-xl">⚠️</span>
        <span>{{ error }}</span>
      </div>
      <ButtonBase variant="secondary" size="sm" @click="recargarDatos">
        Reintentar
      </ButtonBase>
    </div>

    <!-- 2. Estado de Carga (Loading con Skeleton) -->
    <div
      v-if="loading && rutas.length === 0"
      role="status"
      aria-label="Cargando rutas"
      class="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-sm space-y-4"
    >
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div class="h-4 bg-slate-200 rounded w-48 animate-pulse"></div>
        <div class="h-4 bg-slate-200 rounded w-20 animate-pulse"></div>
      </div>
      <div class="space-y-3">
        <div v-for="i in 4" :key="i" class="h-14 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <p class="text-center text-xs text-slate-400 font-medium pt-2">Cargando rutas del sistema...</p>
    </div>

    <!-- 3. Estado Vacío (Empty State) -->
    <div
      v-else-if="!loading && rutasPaginadas.length === 0"
      class="rounded-2xl bg-white p-12 text-center border border-slate-200/80 shadow-sm space-y-3"
    >
      <div class="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center text-3xl mx-auto">
        🛣️
      </div>
      <h3 class="text-base font-bold text-slate-800">No se encontraron rutas</h3>
      <p class="text-xs text-slate-500 max-w-md mx-auto">
        {{ filtroTexto || filtroFecha || filtroEstado !== 'Todas'
          ? 'No hay rutas que coincidan con los filtros aplicados. Intenta restablecer los filtros.'
          : 'Aún no se han programado rutas para esta cooperativa. Comienza habilitando la primera ruta diaria.' }}
      </p>
      <div class="pt-2">
        <ButtonBase
          v-if="filtroTexto || filtroFecha || filtroEstado !== 'Todas'"
          variant="secondary"
          size="sm"
          @click="limpiarFiltros"
        >
          Restablecer Filtros
        </ButtonBase>
        <ButtonBase
          v-else
          variant="primary"
          size="sm"
          @click="abrirModalHabilitar"
        >
          Programar Primera Ruta
        </ButtonBase>
      </div>
    </div>

    <!-- 4. Estado con Datos (Success / Data Table) -->
    <div
      v-else
      class="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden"
    >
      <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Listado de Rutas Programadas
          </h3>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
            {{ totalFiltradas }} total
          </span>
        </div>
        <p class="text-xs text-slate-400">
          Página {{ paginaActual }} de {{ totalPaginas }}
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs sm:text-sm">
          <thead class="bg-slate-50/70 text-slate-500 text-[11px] uppercase font-bold tracking-wider border-b border-slate-100">
            <tr>
              <th class="px-4 py-3.5">Trayecto / Horario</th>
              <th class="px-4 py-3.5">Unidad</th>
              <th class="px-4 py-3.5">Fecha</th>
              <th class="px-4 py-3.5">Estado</th>
              <th class="px-4 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="ruta in rutasPaginadas"
              :key="ruta.id"
              class="hover:bg-slate-50/70 transition-colors"
            >
              <!-- Trayecto y Horario -->
              <td class="px-4 py-3.5">
                <div class="font-bold text-slate-900">
                  {{ obtenerRutaTrayecto(ruta) }}
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <span class="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    ⏱️ {{ ruta.horaSalida || '--:--' }}
                  </span>
                  <span
                    class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tight"
                    :class="ruta.esDirecta ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600'"
                  >
                    {{ ruta.esDirecta ? '⚡ Directo' : '🛑 Con Paradas' }}
                  </span>
                  <span
                    v-if="ruta.observacionChofer?.includes('INCIDENTE')"
                    class="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold uppercase"
                  >
                    🚨 Incidente
                  </span>
                </div>
              </td>

              <!-- Unidad y Chofer -->
              <td class="px-4 py-3.5">
                <div class="font-bold text-slate-800">
                  {{ obtenerBusEtiqueta(ruta.busId) }}
                </div>
                <div class="text-[11px] text-slate-400 font-medium">
                  {{ ruta.choferId ? `Chofer: ${ruta.choferId}` : 'Sin chofer asignado' }}
                </div>
              </td>

              <!-- Fecha -->
              <td class="px-4 py-3.5 whitespace-nowrap">
                <span class="font-mono text-xs font-semibold text-slate-700">
                  {{ ruta.fecha }}
                </span>
              </td>

              <!-- Estado Badge -->
              <td class="px-4 py-3.5 whitespace-nowrap">
                <span
                  class="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border"
                  :class="getEstadoBadgeClass(ruta.estado)"
                >
                  {{ ruta.estado }}
                </span>
              </td>

              <!-- Acciones -->
              <td class="px-4 py-3.5 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                  <ButtonBase
                    v-if="ruta.estado === EstadoRuta.PROGRAMADA"
                    size="sm"
                    variant="primary"
                    :disabled="loading"
                    @click="handleIniciarViaje(ruta)"
                  >
                    Iniciar Viaje
                  </ButtonBase>

                  <ButtonBase
                    v-if="ruta.estado === EstadoRuta.EN_CURSO"
                    size="sm"
                    variant="success"
                    :disabled="loading"
                    @click="handleFinalizarViaje(ruta)"
                  >
                    Finalizar
                  </ButtonBase>

                  <ButtonBase
                    v-if="ruta.estado === EstadoRuta.PROGRAMADA"
                    size="sm"
                    variant="danger"
                    :disabled="loading"
                    @click="handleCancelarViaje(ruta)"
                  >
                    Cancelar
                  </ButtonBase>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Controles de Paginación -->
      <div
        v-if="totalPaginas > 1"
        class="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs"
      >
        <span class="text-slate-500 font-medium">
          Mostrando {{ (paginaActual - 1) * itemsPorPagina + 1 }} a
          {{ Math.min(paginaActual * itemsPorPagina, totalFiltradas) }} de {{ totalFiltradas }}
        </span>
        <div class="flex items-center gap-1.5">
          <ButtonBase
            variant="outline"
            size="sm"
            :disabled="paginaActual <= 1"
            @click="paginaActual--"
          >
            Anterior
          </ButtonBase>
          <span class="px-3 py-1 font-bold text-slate-700">
            {{ paginaActual }} / {{ totalPaginas }}
          </span>
          <ButtonBase
            variant="outline"
            size="sm"
            :disabled="paginaActual >= totalPaginas"
            @click="paginaActual++"
          >
            Siguiente
          </ButtonBase>
        </div>
      </div>
    </div>

    <!-- Modal Desacoplado: Habilitar / Programar Ruta -->
    <ModalHabilitarRuta
      v-model="modalHabilitarAbierto"
      :frecuencias="frecuencias"
      :buses="buses"
      :loading="habilitarLoading"
      :error="habilitarError"
      @habilitar="onHabilitarRuta"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import CardBase from '../../Components/CardBase.vue'
import ButtonBase from '../../Components/ButtonBase.vue'
import InputBase from '../../Components/InputBase.vue'
import ModalHabilitarRuta from '../../Components/ModalHabilitarRuta.vue'
import { useRutas } from '../../Composables/useRutas'
import { useHabilitarRutaDiaria } from '../../Composables/useHabilitarRutaDiaria'
import { useUiStore } from '../../Store/uiStore'
import { EstadoRuta } from '../../../Domain/Constants/EstadosSistema'
import type { Ruta } from '../../../Domain/Entities/Ruta'
import type { HabilitarRutaInput } from '../../../Application/UseCases/HabilitarRutaDiaria'

const uiStore = useUiStore()

const {
  rutas,
  buses,
  frecuencias,
  loading,
  error,
  filtroEstado,
  filtroFecha,
  cargarRutas,
  cargarBuses,
  cargarFrecuencias,
  iniciarViaje,
  finalizarViaje,
  cancelarViaje,
} = useRutas()

const {
  loading: habilitarLoading,
  error: habilitarError,
  habilitar,
  limpiar: limpiarHabilitar,
} = useHabilitarRutaDiaria()

const modalHabilitarAbierto = ref(false)
const filtroTexto = ref('')
const paginaActual = ref(1)
const itemsPorPagina = 8

// Métricas de estados
const conteoProgramadas = computed(
  () => rutas.value.filter((r) => r.estado === EstadoRuta.PROGRAMADA).length
)
const conteoEnCurso = computed(
  () => rutas.value.filter((r) => r.estado === EstadoRuta.EN_CURSO).length
)
const conteoFinalizadas = computed(
  () => rutas.value.filter((r) => r.estado === EstadoRuta.FINALIZADA).length
)

// Filtrado combinado
const listaFiltrada = computed(() => {
  return rutas.value.filter((r) => {
    // Filtro por estado
    if (filtroEstado.value !== 'Todas' && r.estado !== filtroEstado.value) {
      return false
    }

    // Filtro por fecha
    if (filtroFecha.value && r.fecha !== filtroFecha.value) {
      return false
    }

    // Filtro por texto libre
    if (filtroTexto.value.trim()) {
      const q = filtroTexto.value.toLowerCase().trim()
      const trayecto = obtenerRutaTrayecto(r).toLowerCase()
      const busInfo = obtenerBusEtiqueta(r.busId).toLowerCase()
      const chofer = (r.choferId || '').toLowerCase()
      const coincide =
        trayecto.includes(q) || busInfo.includes(q) || chofer.includes(q)
      if (!coincide) return false
    }

    return true
  })
})

const totalFiltradas = computed(() => listaFiltrada.value.length)
const totalPaginas = computed(() => Math.ceil(totalFiltradas.value / itemsPorPagina) || 1)

const rutasPaginadas = computed(() => {
  const inicio = (paginaActual.value - 1) * itemsPorPagina
  return listaFiltrada.value.slice(inicio, inicio + itemsPorPagina)
})

watch([filtroEstado, filtroFecha, filtroTexto], () => {
  paginaActual.value = 1
})

onMounted(async () => {
  await recargarDatos()
})

async function recargarDatos() {
  try {
    await Promise.all([cargarRutas(), cargarBuses(), cargarFrecuencias()])
  } catch {
    // errores capturados por los composables
  }
}

function limpiarFiltros() {
  filtroEstado.value = 'Todas'
  filtroFecha.value = ''
  filtroTexto.value = ''
  paginaActual.value = 1
}

function abrirModalHabilitar() {
  limpiarHabilitar()
  modalHabilitarAbierto.value = true
}

async function onHabilitarRuta(payload: HabilitarRutaInput) {
  try {
    await habilitar(payload)
    await cargarRutas()
    modalHabilitarAbierto.value = false
    uiStore.showAlert({
      title: 'Ruta Habilitada',
      message: 'La ruta ha sido programada y habilitada exitosamente en el sistema.',
      type: 'success',
    })
  } catch {
    // el error se refleja reactivamente en habilitarError y en el modal
  }
}

async function handleIniciarViaje(ruta: Ruta) {
  if (!ruta.id) return
  const confirm = await uiStore.showConfirm({
    title: 'Iniciar Operación de Viaje',
    message: `¿Confirmas el inicio del viaje para la Unidad #${ruta.busId}?`,
    type: 'info',
  })

  if (confirm) {
    try {
      await iniciarViaje(ruta.id)
      uiStore.showAlert({
        title: 'Viaje Iniciado',
        message: 'La unidad ha salido y la ruta se encuentra En Curso.',
        type: 'success',
      })
    } catch (err: any) {
      uiStore.showAlert({
        title: 'Error Operativo',
        message: err.message || 'No se pudo iniciar el viaje.',
        type: 'error',
      })
    }
  }
}

async function handleFinalizarViaje(ruta: Ruta) {
  if (!ruta.id) return
  const confirm = await uiStore.showConfirm({
    title: 'Finalizar Viaje',
    message: `¿Confirmas que el viaje de la Unidad #${ruta.busId} ha concluido satisfactoriamente?`,
    type: 'info',
  })

  if (confirm) {
    try {
      await finalizarViaje(ruta.id)
      uiStore.showAlert({
        title: 'Viaje Finalizado',
        message: 'El viaje ha sido completado y registrado en la bitácora.',
        type: 'success',
      })
    } catch (err: any) {
      uiStore.showAlert({
        title: 'Error Operativo',
        message: err.message || 'No se pudo finalizar el viaje.',
        type: 'error',
      })
    }
  }
}

async function handleCancelarViaje(ruta: Ruta) {
  if (!ruta.id) return
  const confirm = await uiStore.showConfirm({
    title: 'Cancelar Viaje',
    message: `¿Estás seguro de cancelar este viaje programado? Esta acción no se puede deshacer.`,
    type: 'warning',
  })

  if (confirm) {
    try {
      await cancelarViaje(ruta.id, 'Cancelado por el despachador')
      uiStore.showAlert({
        title: 'Viaje Cancelado',
        message: 'El viaje ha sido cancelado.',
        type: 'warning',
      })
    } catch (err: any) {
      uiStore.showAlert({
        title: 'Error Operativo',
        message: err.message || 'No se pudo cancelar el viaje.',
        type: 'error',
      })
    }
  }
}

function obtenerRutaTrayecto(ruta: Ruta): string {
  const f = frecuencias.value.find((item) => item.id === ruta.frecuenciaId)
  if (f) {
    return `${f.ciudadOrigen} → ${f.ciudadDestino}`
  }
  return `Frecuencia #${ruta.frecuenciaId}`
}

function obtenerBusEtiqueta(busId: number): string {
  const b = buses.value.find((item) => item.id === busId)
  if (b) {
    return `Bus #${b.numero} (${b.placa})`
  }
  return `Unidad #${busId}`
}

function getEstadoBadgeClass(estado: string): string {
  switch (estado) {
    case EstadoRuta.PROGRAMADA:
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case EstadoRuta.EN_CURSO:
      return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
    case EstadoRuta.FINALIZADA:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case EstadoRuta.CANCELADA:
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}
</script>
