<template>
  <div class="space-y-6">
    <!-- Resumen de rutas -->
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de rutas">
      <MetricCard
        v-for="tarjeta in tarjetasResumen"
        :key="tarjeta.etiqueta"
        :title="tarjeta.etiqueta"
        :value="loading && rutas.length === 0 ? '—' : tarjeta.valor"
        :icon="tarjeta.icono"
        :description="tarjeta.detalle"
        :variant="tarjeta.variant"
      />
    </section>

    <!-- Barra de búsqueda y filtros unificada -->
    <div
      class="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs md:flex-row md:items-end"
    >
      <div class="w-full md:w-80">
        <SearchInput id="filtro-texto" v-model="filtroTexto" placeholder="Buscar por trayecto o bus..." />
      </div>

      <div class="flex w-full flex-wrap items-end justify-end gap-2.5 md:w-auto">
        <InputBase id="filtro-fecha" v-model="filtroFecha" label="Fecha" type="date" container-class="w-40" />
        <SelectFilter id="filtro-estado" v-model="filtroEstado" label="Estado:" :options="OPCIONES_FILTRO_ESTADO_RUTA" />
        <PageSizeFilter v-model="pageSize" />
        <RefreshButton :loading="loading" @click="recargarDatos" />
        <CreateButton label="Programar ruta" @click="abrirModalHabilitar" />
      </div>
    </div>

    <!-- Catálogo de rutas -->
    <CardBase padding="none">
      <!-- Cargando -->
      <div
        v-if="loading && rutas.length === 0"
        class="space-y-3 p-5 sm:p-6"
        role="status"
        aria-live="polite"
        aria-label="Cargando rutas"
      >
        <span class="sr-only">Cargando rutas...</span>
        <div v-for="fila in 5" :key="fila" class="h-14 animate-pulse rounded-xl bg-slate-100"></div>
      </div>

      <!-- Error sin datos -->
      <div v-else-if="error && rutas.length === 0" class="px-5 py-12 text-center sm:px-6" role="alert">
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl"
          aria-hidden="true"
        >
          ⚠️
        </div>
        <h3 class="mt-4 text-base font-bold text-slate-800">No pudimos cargar las rutas</h3>
        <p class="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">{{ error }}</p>
        <div class="mt-4 flex justify-center">
          <ButtonBase :loading="loading" @click="recargarDatos">Reintentar</ButtonBase>
        </div>
      </div>

      <!-- Vacío (sin rutas o sin coincidencias con los filtros) -->
      <div v-else-if="filasFiltradas.length === 0" class="px-5 py-12 text-center sm:px-6">
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl"
          aria-hidden="true"
        >
          🛣️
        </div>
        <h3 class="mt-4 text-base font-bold text-slate-800">
          {{ hayFiltros ? 'No se encontraron rutas' : 'No hay rutas programadas' }}
        </h3>
        <p class="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
          {{
            hayFiltros
              ? 'No hay rutas que coincidan con la búsqueda o los filtros aplicados.'
              : 'Aún no se han programado rutas para esta cooperativa. Comienza habilitando la primera ruta diaria.'
          }}
        </p>
        <div class="mt-4 flex justify-center">
          <ButtonBase v-if="hayFiltros" variant="secondary" @click="reiniciarFiltros">Restablecer Filtros</ButtonBase>
          <ButtonBase v-else @click="abrirModalHabilitar">Programar primera ruta</ButtonBase>
        </div>
      </div>

      <!-- Datos -->
      <template v-else>
        <div class="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <h3 class="text-sm font-bold uppercase tracking-wider text-slate-800">Rutas programadas</h3>
          <span class="inline-flex w-fit items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
            {{ totalItems }} {{ totalItems === 1 ? 'ruta' : 'rutas' }}
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left text-xs" aria-label="Rutas programadas">
            <thead class="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th scope="col" class="px-6 py-3.5">Trayecto / Horario</th>
                <th scope="col" class="px-6 py-3.5">Unidad / Chofer</th>
                <th scope="col" class="px-6 py-3.5">Fecha</th>
                <th scope="col" class="px-6 py-3.5">Estado</th>
                <th scope="col" class="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
              <tr v-for="fila in rutasPaginadas" :key="fila.ruta.id" class="transition-colors hover:bg-blue-50/50">
                <!-- Trayecto y horario -->
                <td class="px-6 py-3">
                  <div class="font-bold text-slate-900">{{ fila.trayectoEtiqueta }}</div>
                  <div class="mt-1 flex flex-wrap items-center gap-2">
                    <span class="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                      {{ fila.ruta.horaSalida || '--:--' }}
                    </span>
                    <span
                      class="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight"
                      :class="
                        fila.ruta.esDirecta
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      "
                    >
                      {{ etiquetaModalidad(fila.ruta.esDirecta) }}
                    </span>
                    <span
                      v-if="rutaTieneIncidente(fila.ruta)"
                      class="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700"
                    >
                      🚨 Incidente
                    </span>
                  </div>
                </td>

                <!-- Unidad y chofer -->
                <td class="px-6 py-3">
                  <div class="font-bold text-slate-800">{{ fila.busEtiqueta }}</div>
                  <div class="text-[11px] text-slate-500">{{ etiquetaChofer(fila.ruta.choferId, choferes) }}</div>
                  <div
                    v-if="
                      fila.ruta.id &&
                      fila.ruta.estado === EstadoRuta.PROGRAMADA &&
                      choferesDisponibles(fila.ruta.choferId, choferes).length > 0
                    "
                    class="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-center"
                  >
                    <select
                      :value="choferSeleccionadoPorRuta[fila.ruta.id] ?? ''"
                      :aria-label="`Chofer para la ruta ${fila.ruta.id}`"
                      :disabled="loading || choferesLoading"
                      class="min-w-0 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                      @change="elegirChofer(fila.ruta.id, ($event.target as HTMLSelectElement).value)"
                    >
                      <option value="" disabled>{{ textoSelectorChofer(fila.ruta.choferId) }}</option>
                      <option v-for="chofer in choferesDisponibles(fila.ruta.choferId, choferes)" :key="chofer.id" :value="chofer.id">
                        {{ chofer.nombreCompleto }}
                      </option>
                    </select>
                    <ActionButton
                      action="edit"
                      label="Asignar"
                      :disabled="loading || !choferSeleccionadoPorRuta[fila.ruta.id]"
                      :aria-label="`Asignar el chofer elegido a la ruta ${fila.ruta.id}`"
                      @click="handleAsignarChofer(fila.ruta)"
                    />
                  </div>
                </td>

                <!-- Fecha -->
                <td class="whitespace-nowrap px-6 py-3 font-mono text-xs font-semibold text-slate-700">
                  {{ fila.ruta.fecha }}
                </td>

                <!-- Estado -->
                <td class="whitespace-nowrap px-6 py-3">
                  <span
                    class="inline-block rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                    :class="claseBadgeEstadoRuta(fila.ruta.estado)"
                  >
                    {{ etiquetaEstadoRuta(fila.ruta.estado) }}
                  </span>
                </td>

                <!-- Acciones -->
                <td class="whitespace-nowrap px-6 py-3 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <ActionButton
                      v-if="fila.ruta.estado === EstadoRuta.PROGRAMADA"
                      action="primary"
                      label="Iniciar viaje"
                      :disabled="loading || Boolean(motivoInicioBloqueado(fila.ruta.fecha))"
                      :title="motivoInicioBloqueado(fila.ruta.fecha) || undefined"
                      :aria-label="`Iniciar el viaje de la ruta ${fila.ruta.id}`"
                      @click="handleIniciarViaje(fila)"
                    />
                    <ActionButton
                      v-if="fila.ruta.estado === EstadoRuta.EN_CURSO"
                      action="success"
                      label="Finalizar"
                      :disabled="loading"
                      :aria-label="`Finalizar el viaje de la ruta ${fila.ruta.id}`"
                      @click="handleFinalizarViaje(fila)"
                    />
                    <ActionButton
                      v-if="fila.ruta.estado === EstadoRuta.PROGRAMADA"
                      action="danger"
                      label="Cancelar"
                      :disabled="loading"
                      :aria-label="`Cancelar el viaje de la ruta ${fila.ruta.id}`"
                      @click="handleCancelarViaje(fila)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <PaginationControls
          v-if="totalPages > 1"
          :current-page="currentPage"
          :total-pages="totalPages"
          :total-items="totalItems"
          :items-per-page="pageSize"
          :has-prev-page="hasPrevPage"
          :has-next-page="hasNextPage"
          @prev="prevPage"
          @next="nextPage"
          @set-page="setPage"
        />
      </template>
    </CardBase>

    <!-- Modal: habilitar / programar ruta -->
    <ModalHabilitarRuta
      v-model="modalHabilitarAbierto"
      :frecuencias="frecuenciasActivas"
      :buses="busesActivos"
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
import { computed, onMounted, ref, watch } from 'vue'
import ActionButton from '../../Components/ActionButton.vue'
import ButtonBase from '../../Components/ButtonBase.vue'
import CardBase from '../../Components/CardBase.vue'
import CreateButton from '../../Components/CreateButton.vue'
import InputBase from '../../Components/InputBase.vue'
import MetricCard from '../../Components/MetricCard.vue'
import ModalHabilitarRuta from '../../Components/ModalHabilitarRuta.vue'
import PageSizeFilter from '../../Components/PageSizeFilter.vue'
import PaginationControls from '../../Components/PaginationControls.vue'
import RefreshButton from '../../Components/RefreshButton.vue'
import SearchInput from '../../Components/SearchInput.vue'
import SelectFilter from '../../Components/SelectFilter.vue'
import { usePagination } from '../../Composables/usePagination'
import { useRutas } from '../../Composables/useRutas'
import { useHabilitarRutaDiaria } from '../../Composables/useHabilitarRutaDiaria'
import { useUsuarios } from '../../Composables/useUsuarios'
import { useFeedback } from '../../Composables/useFeedback'
import {
  OPCIONES_FILTRO_ESTADO_RUTA,
  choferesDisponibles,
  claseBadgeEstadoRuta,
  etiquetaChofer,
  etiquetaEstadoRuta,
  etiquetaModalidad,
  motivoInicioBloqueado,
  rutaTieneIncidente,
  textoSelectorChofer,
} from '../../Composables/presentacionRutas'
import { EstadoRuta } from '../../../Domain/Constants/EstadosSistema'
import type { Ruta } from '../../../Domain/Entities/Ruta'
import type { RutaFilaPresentacion } from '../../Composables/useRutas'
import type { HabilitarRutaInput } from '../../../Application/UseCases/HabilitarRutaDiaria'
import { mensajeErrorParaUsuario } from '../../Utils/errorMessage'

const { showSuccess, showError, showWarning, confirm } = useFeedback()

const {
  rutas,
  frecuenciasActivas,
  busesActivos,
  filtroTexto,
  filtroFecha,
  filtroEstado,
  hayFiltros,
  loading,
  error,
  resumen,
  filasFiltradas,
  reiniciarFiltros,
  cargarRutas,
  cargarBuses,
  cargarFrecuencias,
  iniciarViaje,
  finalizarViaje,
  cancelarViaje,
  asignarChofer,
} = useRutas()

const {
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  paginatedItems: rutasPaginadas,
  hasPrevPage,
  hasNextPage,
  prevPage,
  nextPage,
  setPage,
  reset: reiniciarPagina,
} = usePagination(filasFiltradas, { initialPageSize: 10 })

// Al cambiar la búsqueda o los filtros se vuelve a la primera página.
watch([filtroTexto, filtroFecha, filtroEstado], reiniciarPagina)

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

// Estado exclusivamente de interfaz.
const modalHabilitarAbierto = ref(false)
const choferSeleccionadoPorRuta = ref<Record<number, string>>({})

const tarjetasResumen = computed(() => [
  { etiqueta: 'Todas las rutas', valor: resumen.value.total, detalle: 'Rutas registradas', icono: '🛣️', variant: 'default' as const },
  { etiqueta: 'Programadas', valor: resumen.value.programadas, detalle: 'Pendientes de salida', icono: '⏱️', variant: 'info' as const },
  { etiqueta: 'En curso', valor: resumen.value.enCurso, detalle: 'Viajando ahora', icono: '🚌', variant: 'warning' as const },
  { etiqueta: 'Finalizadas', valor: resumen.value.finalizadas, detalle: 'Viajes completados', icono: '✅', variant: 'success' as const },
])

onMounted(() => {
  void recargarDatos()
})

async function recargarDatos() {
  try {
    await Promise.all([cargarRutas(), cargarBuses(), cargarFrecuencias(), cargarUsuarios()])
  } catch {
    // El mensaje queda en `error` (estado de la tabla); si ya hay datos en pantalla se avisa con un toast.
    if (rutas.value.length > 0) showError(error.value ?? 'No se pudieron actualizar las rutas.')
  }
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
    showSuccess('La ruta fue programada y habilitada correctamente.')
  } catch (err: unknown) {
    // El detalle ya se muestra dentro del modal; además se avisa con un toast.
    showError(habilitarError.value ?? mensajeErrorParaUsuario(err, 'No se pudo programar la ruta.'))
  }
}

function elegirChofer(rutaId: number, choferId: string) {
  choferSeleccionadoPorRuta.value[rutaId] = choferId
}

async function handleAsignarChofer(ruta: Ruta) {
  const choferId = ruta.id ? choferSeleccionadoPorRuta.value[ruta.id] : ''
  if (!ruta.id || !choferId) return

  try {
    await asignarChofer(ruta.id, choferId)
    delete choferSeleccionadoPorRuta.value[ruta.id]
    showSuccess('El chofer quedó vinculado a la ruta programada.')
  } catch (err: unknown) {
    showError(mensajeErrorParaUsuario(err, 'Ocurrió un error inesperado al asignar el chofer.'))
  }
}

async function handleIniciarViaje({ ruta, busEtiqueta }: RutaFilaPresentacion) {
  if (!ruta.id) return

  const bloqueo = motivoInicioBloqueado(ruta.fecha)
  if (bloqueo) {
    showWarning(bloqueo)
    return
  }

  const confirmado = await confirm({
    title: 'Iniciar viaje',
    message: `¿Confirmas el inicio del viaje de ${busEtiqueta}?`,
    type: 'info',
  })
  if (!confirmado) return

  try {
    await iniciarViaje(ruta.id)
    showSuccess('La unidad salió y la ruta quedó En curso.')
  } catch (err: unknown) {
    showError(mensajeErrorParaUsuario(err, 'No se pudo iniciar el viaje.'))
  }
}

async function handleFinalizarViaje({ ruta, busEtiqueta }: RutaFilaPresentacion) {
  if (!ruta.id) return
  const confirmado = await confirm({
    title: 'Finalizar viaje',
    message: `¿Confirmas que el viaje de ${busEtiqueta} concluyó satisfactoriamente?`,
    type: 'info',
  })
  if (!confirmado) return

  try {
    await finalizarViaje(ruta.id)
    showSuccess('El viaje se completó y quedó registrado.')
  } catch (err: unknown) {
    showError(mensajeErrorParaUsuario(err, 'No se pudo finalizar el viaje.'))
  }
}

async function handleCancelarViaje({ ruta, busEtiqueta }: RutaFilaPresentacion) {
  if (!ruta.id) return
  const confirmado = await confirm({
    title: 'Cancelar viaje',
    message: `¿Estás seguro de cancelar el viaje de ${busEtiqueta}? Esta acción no se puede deshacer.`,
    type: 'warning',
    confirmText: 'Cancelar viaje',
  })
  if (!confirmado) return

  try {
    await cancelarViaje(ruta.id, 'Cancelado por el despachador')
    showWarning('El viaje fue cancelado.')
  } catch (err: unknown) {
    showError(mensajeErrorParaUsuario(err, 'No se pudo cancelar el viaje.'))
  }
}
</script>
