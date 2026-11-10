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
          <RefreshButton
            :loading="loading"
            @click="recargarDatos"
          />
          <CreateButton
            label="Programar Ruta"
            @click="abrirModalHabilitar"
          />
        </div>
      </template>

      <!-- KPI / Resumen de Estados Clicables (MetricCard) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div
          role="button"
          tabindex="0"
          class="text-left transition-all active:scale-95 cursor-pointer rounded-2xl focus:outline-none"
          :class="filtroEstado === 'Todas' ? 'ring-2 ring-blue-500' : ''"
          @click="filtroEstado = 'Todas'"
          @keydown.enter="filtroEstado = 'Todas'"
          @keydown.space.prevent="filtroEstado = 'Todas'"
        >
          <MetricCard
            title="Todas las Rutas"
            :value="rutas.length"
            icon="🛣️"
            variant="default"
          />
        </div>

        <div
          role="button"
          tabindex="0"
          class="text-left transition-all active:scale-95 cursor-pointer rounded-2xl focus:outline-none"
          :class="filtroEstado === EstadoRuta.PROGRAMADA ? 'ring-2 ring-blue-500' : ''"
          @click="filtroEstado = EstadoRuta.PROGRAMADA"
          @keydown.enter="filtroEstado = EstadoRuta.PROGRAMADA"
          @keydown.space.prevent="filtroEstado = EstadoRuta.PROGRAMADA"
        >
          <MetricCard
            title="Programadas"
            :value="rutasProgramadas.length"
            icon="⏱️"
            variant="info"
          />
        </div>

        <div
          role="button"
          tabindex="0"
          class="text-left transition-all active:scale-95 cursor-pointer rounded-2xl focus:outline-none"
          :class="filtroEstado === EstadoRuta.EN_CURSO ? 'ring-2 ring-amber-500' : ''"
          @click="filtroEstado = EstadoRuta.EN_CURSO"
          @keydown.enter="filtroEstado = EstadoRuta.EN_CURSO"
          @keydown.space.prevent="filtroEstado = EstadoRuta.EN_CURSO"
        >
          <MetricCard
            title="En Curso"
            :value="rutasEnCurso.length"
            icon="🚌"
            variant="warning"
          />
        </div>

        <div
          role="button"
          tabindex="0"
          class="text-left transition-all active:scale-95 cursor-pointer rounded-2xl focus:outline-none"
          :class="filtroEstado === EstadoRuta.FINALIZADA ? 'ring-2 ring-emerald-500' : ''"
          @click="filtroEstado = EstadoRuta.FINALIZADA"
          @keydown.enter="filtroEstado = EstadoRuta.FINALIZADA"
          @keydown.space.prevent="filtroEstado = EstadoRuta.FINALIZADA"
        >
          <MetricCard
            title="Finalizadas"
            :value="rutasFinalizadas.length"
            icon="✅"
            variant="success"
          />
        </div>
      </div>
    </CardBase>

    <!-- Barra de Filtros -->
    <div class="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      <div class="flex flex-1 flex-col sm:flex-row gap-3">
        <!-- Búsqueda por texto (SearchInput) -->
        <div class="flex-1">
          <SearchInput
            id="filtro-texto"
            v-model="filtroTexto"
            placeholder="Buscar por origen, destino o bus..."
          />
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
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-600 tracking-wider">
            <tr>
              <th class="px-6 py-3.5">Trayecto / Horario</th>
              <th class="px-6 py-3.5">Unidad / Chofer</th>
              <th class="px-6 py-3.5">Fecha</th>
              <th class="px-6 py-3.5">Estado</th>
              <th class="px-6 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
            <tr
              v-for="fila in rutasPaginadas"
              :key="fila.ruta.id"
              class="hover:bg-slate-50/80 transition-colors"
            >
              <!-- Trayecto y Horario -->
              <td class="px-6 py-3">
                <div class="font-bold text-slate-900">
                  {{ fila.trayectoEtiqueta }}
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <span class="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    ⏱️ {{ fila.ruta.horaSalida || '--:--' }}
                  </span>
                  <span
                    class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tight"
                    :class="fila.ruta.esDirecta ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600'"
                  >
                    {{ fila.ruta.esDirecta ? '⚡ Directo' : '🛑 Con Paradas' }}
                  </span>
                  <span
                    v-if="fila.ruta.observacionChofer?.includes('INCIDENTE')"
                    class="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold uppercase"
                  >
                    🚨 Incidente
                  </span>
                </div>
              </td>

              <!-- Unidad y Chofer -->
              <td class="px-6 py-3">
                <div class="font-bold text-slate-800">
                  {{ fila.busEtiqueta }}
                </div>
                <div class="text-[11px] text-slate-400 font-medium">
                  {{ fila.ruta.choferId ? `Chofer ID: ${fila.ruta.choferId}` : 'Sin chofer asignado' }}
                </div>
                <div
                  v-if="fila.ruta.id && fila.ruta.estado === EstadoRuta.PROGRAMADA && choferes.length > 0"
                  class="mt-2 flex flex-col gap-1.5 sm:flex-row"
                >
                  <select
                    v-model="choferSeleccionadoPorRuta[fila.ruta.id]"
                    :aria-label="`Chofer para ruta ${fila.ruta.id}`"
                    :disabled="loading || choferesLoading"
                    class="min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  >
                    <option value="">Asignar o cambiar chofer</option>
                    <option v-for="chofer in choferes" :key="chofer.id" :value="chofer.id">
                      {{ chofer.nombreCompleto }}
                    </option>
                  </select>
                  <ButtonBase
                    size="sm"
                    variant="outline"
                    :disabled="loading || !choferSeleccionadoPorRuta[fila.ruta.id]"
                    @click="handleAsignarChofer(fila.ruta)"
                  >
                    Asignar
                  </ButtonBase>
                </div>
              </td>

              <!-- Fecha -->
              <td class="px-6 py-3 whitespace-nowrap">
                <span class="font-mono text-xs font-semibold text-slate-700">
                  {{ fila.ruta.fecha }}
                </span>
              </td>

              <!-- Estado Badge -->
              <td class="px-6 py-3 whitespace-nowrap">
                <span
                  class="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border"
                  :class="getEstadoBadgeClass(fila.ruta.estado)"
                >
                  {{ fila.ruta.estado }}
                </span>
              </td>

              <!-- Acciones -->
              <td class="px-6 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                  <ActionButton
                    v-if="fila.ruta.estado === EstadoRuta.PROGRAMADA"
                    action="primary"
                    label="Iniciar Viaje"
                    :disabled="loading"
                    @click="handleIniciarViaje(fila.ruta)"
                  />

                  <ActionButton
                    v-if="fila.ruta.estado === EstadoRuta.EN_CURSO"
                    action="success"
                    label="Finalizar"
                    :disabled="loading"
                    @click="handleFinalizarViaje(fila.ruta)"
                  />

                  <ActionButton
                    v-if="fila.ruta.estado === EstadoRuta.PROGRAMADA"
                    action="danger"
                    label="Cancelar"
                    :disabled="loading"
                    @click="handleCancelarViaje(fila.ruta)"
                  />
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
      :choferes="choferes"
      :choferes-loading="choferesLoading"
      :choferes-error="choferesError"
      :es-dia-operativo="esDiaOperativo"
      :loading="habilitarLoading"
      :error="habilitarError"
      @habilitar="onHabilitarRuta"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CardBase from '../../Components/CardBase.vue'
import ButtonBase from '../../Components/ButtonBase.vue'
import RefreshButton from '../../Components/RefreshButton.vue'
import CreateButton from '../../Components/CreateButton.vue'
import SearchInput from '../../Components/SearchInput.vue'
import MetricCard from '../../Components/MetricCard.vue'
import ActionButton from '../../Components/ActionButton.vue'
import ModalHabilitarRuta from '../../Components/ModalHabilitarRuta.vue'
import { useRutas } from '../../Composables/useRutas'
import { useHabilitarRutaDiaria } from '../../Composables/useHabilitarRutaDiaria'
import { useUsuarios } from '../../Composables/useUsuarios'
import { useFeedback } from '../../Composables/useFeedback'
import { EstadoRuta } from '../../../Domain/Constants/EstadosSistema'
import type { Ruta } from '../../../Domain/Entities/Ruta'
import type { HabilitarRutaInput } from '../../../Application/UseCases/HabilitarRutaDiaria'
import { mensajeErrorParaUsuario } from '../../Utils/errorMessage'

const { showSuccess, showError, showWarning, confirm } = useFeedback()

const {
  rutas,
  buses,
  frecuencias,
  filtroTexto,
  loading,
  error,
  filtroEstado,
  filtroFecha,
  rutasProgramadas,
  rutasEnCurso,
  rutasFinalizadas,
  rutasPaginadas,
  totalFiltradas,
  paginaActual,
  totalPaginas,
  itemsPorPagina,
  cargarRutas,
  cargarBuses,
  cargarFrecuencias,
  iniciarViaje,
  finalizarViaje,
  cancelarViaje,
  asignarChofer,
} = useRutas()

const {
  choferesActivos: choferes,
  loading: choferesLoading,
  error: choferesError,
  cargarUsuarios,
} = useUsuarios()

const {
  loading: habilitarLoading,
  error: habilitarError,
  habilitar,
  esDiaOperativo,
  limpiar: limpiarHabilitar,
} = useHabilitarRutaDiaria()

const modalHabilitarAbierto = ref(false)
const choferSeleccionadoPorRuta = ref<Record<number, string>>({})

onMounted(async () => {
  await recargarDatos()
})

async function recargarDatos() {
  try {
    await Promise.all([
      cargarRutas(),
      cargarBuses(),
      cargarFrecuencias(),
      cargarUsuarios(),
    ])
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
    showSuccess('La ruta ha sido programada y habilitada exitosamente.')
  } catch {
    // el error se refleja reactivamente en habilitarError y en el modal
  }
}

async function handleAsignarChofer(ruta: Ruta) {
  if (!ruta.id) return

  const choferId = choferSeleccionadoPorRuta.value[ruta.id]
  if (!choferId) return

  try {
    await asignarChofer(ruta.id, choferId)
    delete choferSeleccionadoPorRuta.value[ruta.id]
    showSuccess('El chofer quedó vinculado a la ruta programada.')
  } catch (err: unknown) {
    showError(mensajeErrorParaUsuario(err, 'Ocurrió un error inesperado al asignar el chofer.'))
  }
}

async function handleIniciarViaje(ruta: Ruta) {
  if (!ruta.id) return
  const confirmado = await confirm({
    title: 'Iniciar Operación de Viaje',
    message: `¿Confirmas el inicio del viaje para la Unidad #${ruta.busId}?`,
    type: 'info',
  })

  if (confirmado) {
    try {
      await iniciarViaje(ruta.id)
      showSuccess('La unidad ha salido y la ruta se encuentra En Curso.')
    } catch (err: unknown) {
      showError(mensajeErrorParaUsuario(err, 'No se pudo iniciar el viaje.'))
    }
  }
}

async function handleFinalizarViaje(ruta: Ruta) {
  if (!ruta.id) return
  const confirmado = await confirm({
    title: 'Finalizar Viaje',
    message: `¿Confirmas que el viaje de la Unidad #${ruta.busId} ha concluido satisfactoriamente?`,
    type: 'info',
  })

  if (confirmado) {
    try {
      await finalizarViaje(ruta.id)
      showSuccess('El viaje ha sido completado y registrado en la bitácora.')
    } catch (err: unknown) {
      showError(mensajeErrorParaUsuario(err, 'No se pudo finalizar el viaje.'))
    }
  }
}

async function handleCancelarViaje(ruta: Ruta) {
  if (!ruta.id) return
  const confirmado = await confirm({
    title: 'Cancelar Viaje',
    message: '¿Estás seguro de cancelar este viaje programado? Esta acción no se puede deshacer.',
    type: 'warning',
  })

  if (confirmado) {
    try {
      await cancelarViaje(ruta.id, 'Cancelado por el despachador')
      showWarning('El viaje ha sido cancelado.')
    } catch (err: unknown) {
      showError(mensajeErrorParaUsuario(err, 'No se pudo cancelar el viaje.'))
    }
  }
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
