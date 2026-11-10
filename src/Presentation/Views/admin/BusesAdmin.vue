<template>
  <div class="space-y-6">
    <!-- Estado de error global -->
    <div
      v-if="errorGeneral"
      role="alert"
      aria-live="assertive"
      class="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm sm:flex-row sm:items-start sm:justify-between"
    >
      <div class="flex items-start gap-2.5">
        <span class="text-base" aria-hidden="true">⚠️</span>
        <div>
          <p class="font-bold">No se pudo completar la operación</p>
          <p class="mt-0.5 text-xs leading-relaxed">{{ errorGeneral }}</p>
        </div>
      </div>
      <button
        type="button"
        class="self-start rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-bold text-red-700 transition-colors hover:bg-red-100"
        @click="limpiarErrores"
      >
        Descartar
      </button>
    </div>

    <!-- Resumen de la flota -->
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de la flota">
      <MetricCard
        v-for="tarjeta in tarjetasResumen"
        :key="tarjeta.etiqueta"
        :title="tarjeta.etiqueta"
        :value="busesLoading && !buses.length ? '—' : tarjeta.valor"
        :icon="tarjeta.icono"
        :description="tarjeta.detalle"
        :variant="tarjeta.variant"
      />
    </section>

    <!-- Barra de Búsqueda y Filtros Unificada (Estilo Usuarios.vue) -->
    <div class="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
      <div class="w-full md:w-72">
        <SearchInput
          id="bus-search"
          v-model="busqueda"
          placeholder="Buscar por número o placa..."
        />
      </div>

      <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
        <SelectFilter
          label="Estado:"
          v-model="filtroEstado"
          :options="opcionesEstado"
        />

        <SelectFilter
          label="Estructura:"
          v-model="filtroEstructura"
          :options="opcionesEstructura"
        />

        <PageSizeFilter
          v-model="pageSize"
        />

        <RefreshButton
          :loading="cargandoCatalogo"
          @click="recargarCatalogo"
        />

        <CreateButton
          label="Registrar bus"
          @click="abrirNuevoBus"
        />
      </div>
    </div>

    <!-- Catálogo -->
    <CardBase padding="none">
      <!-- Cargando -->
      <div
        v-if="cargandoCatalogo && !buses.length"
        class="space-y-3 p-5 sm:p-6"
        role="status"
        aria-live="polite"
        aria-label="Cargando catálogo de buses"
      >
        <span class="sr-only">Cargando buses...</span>
        <div v-for="fila in 5" :key="fila" class="h-14 animate-pulse rounded-xl bg-slate-100"></div>
      </div>

      <!-- Error sin datos -->
      <div v-else-if="errorGeneral && !buses.length" class="px-5 py-12 text-center sm:px-6">
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl"
          aria-hidden="true"
        >
          ⚠️
        </div>
        <h3 class="mt-4 text-base font-bold text-slate-800">No pudimos cargar la flota</h3>
        <p class="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
          {{ errorGeneral }}
        </p>
        <div class="mt-4 flex justify-center">
          <ButtonBase :loading="cargandoCatalogo" @click="recargarCatalogo">Reintentar</ButtonBase>
        </div>
      </div>

      <!-- Estado vacío cuando no hay buses en general -->
      <div v-else-if="!buses.length" class="px-5 py-12 text-center sm:px-6">
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl"
          aria-hidden="true"
        >
          🚌
        </div>
        <h3 class="mt-4 text-base font-bold text-slate-800">No hay buses registrados</h3>
        <p class="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
          Aún no existe ninguna unidad en el catálogo de flota. Registra el primer bus para comenzar
          a gestionar la operación.
        </p>
        <div class="mt-4 flex justify-center">
          <ButtonBase @click="abrirNuevoBus">Registrar primer bus</ButtonBase>
        </div>
      </div>

      <!-- Estado vacío cuando los filtros no devuelven resultados -->
      <div v-else-if="busesFiltrados.length === 0" class="px-5 py-12 text-center sm:px-6">
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl"
          aria-hidden="true"
        >
          🔍
        </div>
        <h3 class="mt-4 text-base font-bold text-slate-800">No se encontraron buses</h3>
        <p class="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
          No existen unidades que coincidan con el término de búsqueda o los filtros seleccionados.
        </p>
        <div class="mt-4 flex justify-center">
          <ButtonBase variant="outline" size="sm" @click="resetFiltros">
            Restablecer Filtros
          </ButtonBase>
        </div>
      </div>

      <!-- Éxito / datos -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm border-collapse min-w-[860px]" aria-label="Catálogo de flota de buses">
          <caption class="sr-only">
            Catálogo de buses con número, placa, capacidad, estructura, estado y acciones
          </caption>
          <thead class="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-600 tracking-wider">
            <tr>
              <th scope="col" class="px-6 py-3.5">Bus</th>
              <th scope="col" class="px-6 py-3.5">Placa</th>
              <th scope="col" class="px-6 py-3.5">Capacidad</th>
              <th scope="col" class="px-6 py-3.5">Estructura</th>
              <th scope="col" class="px-6 py-3.5 text-center">Estado</th>
              <th scope="col" class="px-6 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
            <tr
              v-for="bus in busesPaginados"
              :key="bus.id ?? bus.placa"
              class="hover:bg-blue-50/50 transition-colors"
            >
              <td class="px-6 py-3">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-base ring-1 ring-blue-100"
                    aria-hidden="true"
                  >
                    🚌
                  </div>
                  <div class="min-w-0">
                    <p class="font-bold text-slate-900 text-sm leading-tight">Bus {{ bus.numero }}</p>
                    <p class="text-slate-400 text-xs">
                      {{ bus.marcaChasis || 'Marca no registrada' }}
                    </p>
                    <!-- Insignias de contingencia / reemplazo operativo -->
                    <div v-if="obtenerContingencia(bus)" class="mt-1.5 flex flex-col gap-1">
                      <span
                        v-if="obtenerContingencia(bus)?.tipo === 'afectado'"
                        class="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 border border-amber-200 shadow-2xs"
                      >
                        <span class="text-xs" aria-hidden="true">🔄</span>
                        <span>Reemplazado por <strong>Bus {{ obtenerContingencia(bus)?.reemplazo }}</strong></span>
                      </span>
                      <span
                        v-if="obtenerContingencia(bus)?.tipo === 'afectado'"
                        class="text-[10px] font-semibold text-amber-700/90 pl-0.5"
                      >
                        ⚠️ Rutas y frecuencias transferidas temporalmente al Bus {{ obtenerContingencia(bus)?.reemplazo }}
                      </span>

                      <span
                        v-else-if="obtenerContingencia(bus)?.tipo === 'reemplazo'"
                        class="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-800 border border-blue-200 shadow-2xs"
                      >
                        <span class="text-xs" aria-hidden="true">🛡️</span>
                        <span>Cubriendo contingencia de <strong>Bus {{ obtenerContingencia(bus)?.afectado }}</strong></span>
                      </span>
                      <span
                        v-if="obtenerContingencia(bus)?.tipo === 'reemplazo'"
                        class="text-[10px] font-semibold text-blue-700/90 pl-0.5"
                      >
                        ⚡ Operando y cubriendo rutas asignadas al Bus {{ obtenerContingencia(bus)?.afectado }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-3">
                <span class="font-mono text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/80 inline-block">
                  {{ bus.placa }}
                </span>
              </td>
              <td class="px-6 py-3">
                <span class="text-sm font-bold text-slate-900">{{ bus.totalAsientos }}</span>
                <span class="text-xs text-slate-400"> asientos</span>
              </td>
              <td class="px-6 py-3">
                <span class="text-xs text-slate-700 font-medium">{{ estructuraLabel(bus.estructura) }}</span>
              </td>
              <td class="px-6 py-3 text-center">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-2xs"
                  :class="estadoInfo(bus.estado).badge"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full"
                    :class="estadoInfo(bus.estado).dot"
                    aria-hidden="true"
                  ></span>
                  {{ estadoInfo(bus.estado).label }}
                </span>
                <span
                  v-if="obtenerContingencia(bus)?.tipo === 'reemplazo'"
                  class="mt-1 block text-[9px] font-bold uppercase tracking-wider text-blue-600"
                >
                  En contingencia
                </span>
                <span
                  v-else-if="obtenerContingencia(bus)?.tipo === 'afectado'"
                  class="mt-1 block text-[9px] font-bold uppercase tracking-wider text-amber-600"
                >
                  Con reemplazo activo
                </span>
              </td>
              <td class="px-6 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <ActionButton
                    action="edit"
                    :disabled="cargandoCatalogo"
                    :aria-label="`Editar bus ${bus.numero}`"
                    @click="abrirEdicion(bus)"
                  />

                  <ActionButton
                    v-if="puedeReportarIncidente(bus)"
                    action="warning"
                    label="Incidente"
                    :disabled="cargandoCatalogo"
                    :aria-label="`Reportar incidente del bus ${bus.numero}`"
                    @click="abrirReporte(bus)"
                  />

                  <ActionButton
                    v-if="puedeDesactivar(bus)"
                    action="danger"
                    label="Desactivar"
                    :disabled="cargandoCatalogo"
                    :aria-label="`Desactivar bus ${bus.numero}`"
                    @click="confirmarCambioEstado(bus, 'desactivar')"
                  />

                  <ActionButton
                    v-else-if="puedeActivar(bus)"
                    action="success"
                    label="Activar"
                    :disabled="cargandoCatalogo"
                    :aria-label="`Activar bus ${bus.numero}`"
                    @click="confirmarCambioEstado(bus, 'activar')"
                  />

                  <ActionButton
                    v-else-if="puedeReactivar(bus)"
                    action="primary"
                    label="Reactivar"
                    :disabled="cargandoCatalogo"
                    :aria-label="`Reactivar bus ${bus.numero}`"
                    @click="confirmarCambioEstado(bus, 'reactivar')"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <template #footer>
        <div
          class="flex w-full flex-col gap-2 px-5 pb-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <p>Los cambios de estado se reflejan automáticamente en el catálogo.</p>
          <p class="font-semibold text-slate-600">{{ buses.length }} buses listados</p>
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

    <!-- Modales desacoplados -->
    <ModalBase
      :model-value="mostrarNuevoBusModal"
      title="Registrar Nuevo Bus"
      max-width="2xl"
      @update:model-value="mostrarNuevoBusModal = $event"
      @close="cerrarNuevoBusModal"
    >
      <form id="form-crear-bus-modal" class="space-y-4" @submit.prevent="manejarRegistrarBusModal">
        <div
          v-if="busesError"
          role="alert"
          class="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
        >
          <span aria-hidden="true">⚠️</span>
          <span>{{ busesError }}</span>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <!-- Información de la cooperativa vinculada -->
          <div class="rounded-xl border border-blue-100 bg-blue-50/70 p-3 sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-2 text-blue-900 font-semibold">
              <span>🏢 Cooperativa asignada:</span>
              <span class="font-bold text-blue-700">Cooperativa N.º {{ cooperativaId }}</span>
            </div>
            <span class="text-[10px] uppercase font-bold text-blue-600 bg-white px-2 py-0.5 rounded-md border border-blue-200 self-start sm:self-auto">
              Vinculación automática por sesión
            </span>
          </div>

          <InputBase
            id="modal-nuevo-bus-numero"
            label="Número de bus (Disco)"
            placeholder="Ej. 25"
            required
            :model-value="nuevoNumero"
            :disabled="busesLoading"
            :error="errorNumeroBus"
            helper-text="Identificador interno o número de disco asignado al bus."
            @update:model-value="onNumeroNuevoInput"
          />

          <InputBase
            id="modal-nuevo-bus-placa"
            label="Placa vehicular"
            placeholder="Ej. PBA-1234"
            required
            :model-value="nuevaPlaca"
            :disabled="busesLoading"
            :error="errorPlaca"
            :helper-text="helperPlaca || 'Formato oficial ANT (ej. PBA-1234 o PBA-254).'"
            @update:model-value="onPlacaNuevaInput"
          />

          <InputBase
            id="modal-nuevo-bus-asientos"
            label="Capacidad total de asientos"
            type="number"
            min="1"
            max="90"
            step="1"
            required
            :model-value="nuevosAsientos"
            :disabled="busesLoading"
            :error="errorAsientos"
            helper-text="Número entero mayor a 0 (ej. 40)."
            @update:model-value="onTotalAsientosNuevo"
          />

          <div class="space-y-1.5">
            <label
              for="modal-nuevo-bus-estructura"
              class="block text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              Estructura del Bus <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <select
                id="modal-nuevo-bus-estructura"
                :value="nuevaEstructura"
                :disabled="busesLoading"
                required
                class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed appearance-none pr-10"
                @change="onEstructuraNueva"
              >
                <option value="UnPiso">Un piso (Estándar)</option>
                <option value="DosPisos">Dos pisos (Doble piso)</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p class="text-[11px] text-slate-400">Distribución física de la unidad.</p>
          </div>
        </div>
      </form>

      <template #footer>
        <ButtonBase
          variant="secondary"
          :disabled="busesLoading"
          @click="cerrarNuevoBusModal"
        >
          Cancelar
        </ButtonBase>
        <ButtonBase
          type="submit"
          form="form-crear-bus-modal"
          :loading="busesLoading"
        >
          Registrar Bus
        </ButtonBase>
      </template>
    </ModalBase>

    <EditarBusModal
      v-model="mostrarEdicion"
      :bus="busEnEdicion"
      :loading="busesLoading"
      :error="busesError"
      @save="manejarGuardarBus"
      @close="cerrarEdicion"
    />

    <ReportarIncidenteModal
      v-model="mostrarIncidente"
      :bus="busConIncidente"
      :form="formIncidente"
      :motivos="motivosCatalogo"
      :buses-reemplazo="busesReemplazo"
      :loading="reporteLoading"
      :error="reporteError"
      @update:form="actualizarFormIncidente"
      @select-motivo="seleccionarMotivo"
      @submit="manejarReportarIncidente"
      @close="cerrarReporte"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import CardBase from '../../Components/CardBase.vue'
import ButtonBase from '../../Components/ButtonBase.vue'
import ActionButton from '../../Components/ActionButton.vue'
import MetricCard from '../../Components/MetricCard.vue'
import SearchInput from '../../Components/SearchInput.vue'
import SelectFilter from '../../Components/SelectFilter.vue'
import PageSizeFilter from '../../Components/PageSizeFilter.vue'
import PaginationControls from '../../Components/PaginationControls.vue'
import CreateButton from '../../Components/CreateButton.vue'
import RefreshButton from '../../Components/RefreshButton.vue'
import InputBase from '../../Components/InputBase.vue'
import ModalBase from '../../Components/ModalBase.vue'
import EditarBusModal from '../../Components/EditarBusModal.vue'
import ReportarIncidenteModal from '../../Components/ReportarIncidenteModal.vue'
import { usePlacaValidation } from '../../Composables/usePlacaValidation'
import { useBusFormValidation } from '../../Composables/useBusFormValidation'
import { useFeedback } from '../../Composables/useFeedback'
import { usePagination } from '../../Composables/usePagination'
import { useBuses, type GuardarBusInput } from '../../Composables/useBuses'
import { useControlBuses } from '../../Composables/useControlBuses'
import {
  useReportarIncidente,
  type FormIncidente,
} from '../../Composables/useReportarIncidente'
import { useAuthStore } from '../../Store/authStore'
import { useUiStore } from '../../Store/uiStore'
import { EstadoBus } from '../../../Domain/Constants/EstadosSistema'
import type { Bus } from '../../../Domain/Entities/Bus'

type EstructuraBus = 'UnPiso' | 'DosPisos'

const authStore = useAuthStore()
const uiStore = useUiStore()
const { showSuccess, showError, showWarning, confirm } = useFeedback()

const cooperativaId = authStore.user?.cooperativaId ?? 1

const {
  buses,
  nuevoBus,
  loading: busesLoading,
  error: busesError,
  cargarBuses,
  registrarBus,
  guardarBus,
  limpiarError: limpiarErrorBuses,
} = useBuses()

const {
  buses: busesDisponibles,
  loading: controlLoading,
  error: controlError,
  success: controlSuccess,
  cargarBusesActivos,
  activarBus,
  desactivarBus,
  reactivarBus,
  limpiarMensajes: limpiarMensajesControl,
} = useControlBuses({ cooperativaId })

const {
  formIncidente,
  motivosCatalogo,
  seleccionarMotivo,
  loading: reporteLoading,
  error: reporteError,
  success: reporteSuccess,
  responseData: reporteResponse,
  reportarIncidente,
  reiniciarReporte,
} = useReportarIncidente(cooperativaId)

nuevoBus.value.cooperativaId = cooperativaId

// Filtros y búsqueda reactiva
const busqueda = ref('')
const filtroEstado = ref<string>('Todos')
const filtroEstructura = ref<string>('Todas')

const busesFiltrados = computed(() => {
  return buses.value.filter((bus) => {
    // Filtro por término de búsqueda (número o placa con matching flexible)
    const termino = busqueda.value.toLowerCase().trim()
    const numBus = String(bus.numero || '').toLowerCase()
    const placaBus = String(bus.placa || '').toLowerCase()
    const chasisBus = String(bus.marcaChasis || '').toLowerCase()
    const soloDigitos = termino.replace(/[^0-9]/g, '')

    const coincideNumero =
      numBus.includes(termino) ||
      `bus ${numBus}`.includes(termino) ||
      `disco ${numBus}`.includes(termino) ||
      (soloDigitos.length > 0 && numBus.includes(soloDigitos))

    const coincidePlaca =
      placaBus.includes(termino) ||
      placaBus.replace(/-/g, '').includes(termino.replace(/-/g, ''))

    const coincideChasis = chasisBus.includes(termino)

    const coincideBusqueda = !termino || coincideNumero || coincidePlaca || coincideChasis

    // Filtro por estado operativo
    const coincideEstado =
      filtroEstado.value === 'Todos' || bus.estado === filtroEstado.value

    // Filtro por estructura
    const coincideEstructura =
      filtroEstructura.value === 'Todas' || bus.estructura === filtroEstructura.value

    return coincideBusqueda && coincideEstado && coincideEstructura
  })
})

const {
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  paginatedItems: busesPaginados,
  hasPrevPage,
  hasNextPage,
  prevPage,
  nextPage,
  setPage,
} = usePagination(busesFiltrados, { initialPageSize: 10 })

function resetFiltros() {
  busqueda.value = ''
  filtroEstado.value = 'Todos'
  filtroEstructura.value = 'Todas'
}

// Estado exclusivamente de interfaz (apertura de paneles y selección de fila).
const mostrarNuevoBusModal = ref(false)
const mostrarEdicion = ref(false)
const mostrarIncidente = ref(false)
const busEnEdicion = ref<Bus | null>(null)
const busConIncidente = ref<Bus | null>(null)

const usuarioReportante = computed(
  () =>
    authStore.user?.email ||
    authStore.user?.nombre ||
    authStore.user?.nombres ||
    'Administrador',
)

const identificadorReactivacion = computed(
  () => authStore.user?.id || authStore.user?.email || 'administrador',
)

const cargandoGeneral = computed(
  () => busesLoading.value || controlLoading.value || reporteLoading.value,
)
const cargandoCatalogo = computed(() => busesLoading.value || controlLoading.value)
const errorGeneral = computed(() => busesError.value || controlError.value)

const resumenFlota = computed(() => {
  const total = buses.value.length
  const activos = buses.value.filter((bus) => bus.estado === EstadoBus.ACTIVO).length
  const mantenimiento = buses.value.filter(
    (bus) => bus.estado === EstadoBus.MANTENIMIENTO,
  ).length
  const fueraServicio = buses.value.filter(
    (bus) => bus.estado === EstadoBus.FUERA_DE_SERVICIO,
  ).length

  return { total, activos, mantenimiento, fueraServicio }
})

const tarjetasResumen = computed(() => [
  {
    etiqueta: 'Total flota',
    valor: resumenFlota.value.total,
    detalle: 'Unidades registradas',
    icono: '🚌',
    variant: 'default' as const,
  },
  {
    etiqueta: 'Activos',
    valor: resumenFlota.value.activos,
    detalle: 'Disponibles para operar',
    icono: '✅',
    variant: 'success' as const,
  },
  {
    etiqueta: 'Mantenimiento',
    valor: resumenFlota.value.mantenimiento,
    detalle: 'Fuera de operación temporal',
    icono: '🛠️',
    variant: 'warning' as const,
  },
  {
    etiqueta: 'Fuera de servicio',
    valor: resumenFlota.value.fueraServicio,
    detalle: 'Requieren revisión técnica',
    icono: '⛔',
    variant: 'danger' as const,
  },
])

const opcionesEstado = [
  { value: 'Todos', label: 'Todos' },
  { value: EstadoBus.ACTIVO, label: 'Activo' },
  { value: EstadoBus.INACTIVO, label: 'Inactivo' },
  { value: EstadoBus.MANTENIMIENTO, label: 'Mantenimiento' },
  { value: EstadoBus.FUERA_DE_SERVICIO, label: 'Fuera de Servicio' },
]

const opcionesEstructura = [
  { value: 'Todas', label: 'Todas' },
  { value: 'UnPiso', label: 'Un Piso' },
  { value: 'DosPisos', label: 'Dos Pisos' },
]

interface EstadoInfo {
  label: string
  badge: string
  dot: string
}

const ESTADOS_INFO: Record<string, EstadoInfo> = {
  [EstadoBus.ACTIVO]: {
    label: 'Activo',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  [EstadoBus.INACTIVO]: {
    label: 'Inactivo',
    badge: 'border-slate-200 bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
  },
  [EstadoBus.MANTENIMIENTO]: {
    label: 'Mantenimiento',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
  [EstadoBus.FUERA_DE_SERVICIO]: {
    label: 'Fuera de servicio',
    badge: 'border-red-200 bg-red-50 text-red-700',
    dot: 'bg-red-500',
  },
}

function estadoInfo(estado?: string): EstadoInfo {
  if (estado && ESTADOS_INFO[estado]) return ESTADOS_INFO[estado]
  return {
    label: estado || 'Sin estado',
    badge: 'border-slate-200 bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
  }
}

function estructuraLabel(estructura?: string) {
  return estructura === 'DosPisos' ? 'Dos pisos' : 'Un piso'
}

function puedeDesactivar(bus: Bus) {
  return bus.estado === EstadoBus.ACTIVO
}

function puedeActivar(bus: Bus) {
  return bus.estado === EstadoBus.INACTIVO
}

function puedeReactivar(bus: Bus) {
  return bus.estado === EstadoBus.MANTENIMIENTO
}

function puedeReportarIncidente(bus: Bus) {
  return bus.estado !== EstadoBus.MANTENIMIENTO && bus.estado !== EstadoBus.FUERA_DE_SERVICIO
}

interface ContingenciaOperativa {
  busAfectadoNumero: string
  busReemplazoNumero: string
}

const STORAGE_KEY_CONTINGENCIAS = `boleteria_contingencias_${cooperativaId}`

function cargarContingenciasStorage(): ContingenciaOperativa[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CONTINGENCIAS) : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // fallback
  }
  return []
}

function guardarContingenciasStorage(lista: ContingenciaOperativa[]) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CONTINGENCIAS, JSON.stringify(lista))
    }
  } catch {
    // fallback
  }
}

const contingencias = ref<ContingenciaOperativa[]>(cargarContingenciasStorage())

// Sincronización automática de contingencias según el estado real de la flota
watch(
  buses,
  (nuevosBuses) => {
    if (!nuevosBuses || nuevosBuses.length === 0) return

    // 1. Mantener contingencias cuyo bus afectado siga en MANTENIMIENTO
    let activas = contingencias.value.filter((c) => {
      const afectado = nuevosBuses.find(
        (b) => String(b.numero) === String(c.busAfectadoNumero),
      )
      return afectado && afectado.estado === EstadoBus.MANTENIMIENTO
    })

    // 2. Si no había contingencia persistida pero existe un bus en MANTENIMIENTO y uno ACTIVO
    if (activas.length === 0) {
      const enMantenimiento = nuevosBuses.find(
        (b) => b.estado === EstadoBus.MANTENIMIENTO,
      )
      const reemplazo = nuevosBuses.find(
        (b) => b.estado === EstadoBus.ACTIVO && b.numero !== enMantenimiento?.numero,
      )
      if (enMantenimiento && reemplazo) {
        activas.push({
          busAfectadoNumero: String(enMantenimiento.numero),
          busReemplazoNumero: String(reemplazo.numero),
        })
      }
    }

    contingencias.value = activas
    guardarContingenciasStorage(activas)
  },
  { immediate: true },
)

function obtenerContingencia(bus: Bus) {
  const num = String(bus.numero)
  // Caso 1: Bus que fue enviado a mantenimiento y reemplazado
  const comoAfectado = contingencias.value.find((c) => c.busAfectadoNumero === num)
  if (comoAfectado && bus.estado === EstadoBus.MANTENIMIENTO) {
    return {
      tipo: 'afectado' as const,
      reemplazo: comoAfectado.busReemplazoNumero,
    }
  }

  // Caso 2: Bus activo que está cubriendo la contingencia
  const comoReemplazo = contingencias.value.find((c) => c.busReemplazoNumero === num)
  if (comoReemplazo) {
    const afectado = buses.value.find((b) => String(b.numero) === comoReemplazo.busAfectadoNumero)
    if (!afectado || afectado.estado === EstadoBus.MANTENIMIENTO) {
      return {
        tipo: 'reemplazo' as const,
        afectado: comoReemplazo.busAfectadoNumero,
      }
    }
  }

  return null
}

const busesReemplazo = computed(() =>
  busesDisponibles.value.filter((bus) => bus.numero !== busConIncidente.value?.numero),
)

function actualizarFormIncidente(patch: Partial<FormIncidente>) {
  Object.assign(formIncidente, patch)
}

// Validación desacoplada del formulario de bus (Headless)
const {
  numero: nuevoNumero,
  placa: nuevaPlaca,
  totalAsientos: nuevosAsientos,
  estructura: nuevaEstructura,
  errorNumero: errorNumeroBus,
  errorPlaca,
  errorAsientos,
  helperPlaca,
  onNumeroInput,
  onPlacaInput,
  onTotalAsientosInput,
  validateAll: validarNuevoBus,
  resetForm: resetFormNuevoBus,
} = useBusFormValidation({ totalAsientos: 40, estructura: 'UnPiso' })

function onNumeroNuevoInput(val: string) {
  onNumeroInput(val)
  nuevoBus.value.numero = nuevoNumero.value
}

function onPlacaNuevaInput(val: string) {
  onPlacaInput(val)
  nuevoBus.value.placa = nuevaPlaca.value
}

function onTotalAsientosNuevo(val: string | number) {
  onTotalAsientosInput(val)
  nuevoBus.value.totalAsientos = nuevosAsientos.value
}

function onEstructuraNueva(event: Event) {
  const val = (event.target as HTMLSelectElement).value as EstructuraBus
  nuevaEstructura.value = val
  nuevoBus.value.estructura = val
}

function abrirNuevoBus() {
  resetFormNuevoBus()
  nuevoBus.value.numero = ''
  nuevoBus.value.placa = ''
  nuevoBus.value.totalAsientos = 40
  nuevoBus.value.estructura = 'UnPiso'
  nuevoBus.value.cooperativaId = cooperativaId
  mostrarNuevoBusModal.value = true
}

function cerrarNuevoBusModal() {
  mostrarNuevoBusModal.value = false
  limpiarErrorBuses()
  resetFormNuevoBus()
}

async function manejarRegistrarBusModal() {
  if (!validarNuevoBus()) {
    return
  }

  nuevoBus.value.numero = nuevoNumero.value
  nuevoBus.value.placa = nuevaPlaca.value
  nuevoBus.value.totalAsientos = nuevosAsientos.value
  nuevoBus.value.estructura = nuevaEstructura.value
  nuevoBus.value.cooperativaId = cooperativaId

  const numero = nuevoNumero.value
  const exito = await registrarBus()

  if (!exito) return

  mostrarNuevoBusModal.value = false
  resetFormNuevoBus()
  showSuccess(`El bus ${numero || 'nuevo'} se agregó correctamente al catálogo de flota.`)
}

function abrirEdicion(bus: Bus) {
  limpiarErrorBuses()
  busEnEdicion.value = bus
  mostrarEdicion.value = true
}

function cerrarEdicion() {
  mostrarEdicion.value = false
  busEnEdicion.value = null
  limpiarErrorBuses()
}

async function manejarGuardarBus(payload: GuardarBusInput) {
  const exito = await guardarBus(payload)

  if (!exito) return

  mostrarEdicion.value = false
  busEnEdicion.value = null
  showSuccess(`Los datos del bus ${payload.numero} se actualizaron correctamente.`)
}

function abrirReporte(bus: Bus) {
  reiniciarReporte()
  formIncidente.busNumero = bus.numero
  formIncidente.reportadoPor = usuarioReportante.value
  busConIncidente.value = bus
  mostrarIncidente.value = true

  // Se refrescan los buses activos para ofrecer reemplazos válidos.
  void cargarBusesActivos()
}

const ultimoReporte = ref<{ busNumero: string; replacementBusNumero: string }>({
  busNumero: '',
  replacementBusNumero: '',
})

async function manejarReportarIncidente() {
  ultimoReporte.value = {
    busNumero: formIncidente.busNumero,
    replacementBusNumero: formIncidente.replacementBusNumero,
  }
  await reportarIncidente()
}

function cerrarReporte() {
  mostrarIncidente.value = false
  busConIncidente.value = null
  reiniciarReporte()
}

watch(reporteSuccess, async (exito) => {
  if (!exito) return

  const busAfectado =
    reporteResponse.value?.busActualizado?.numero ||
    ultimoReporte.value.busNumero ||
    formIncidente.busNumero
  const busReemplazo =
    reporteResponse.value?.acciones.busReemplazoSugerido?.numero ||
    ultimoReporte.value.replacementBusNumero ||
    formIncidente.replacementBusNumero

  if (busReemplazo && busAfectado) {
    contingencias.value = contingencias.value.filter(
      (c) => c.busAfectadoNumero !== String(busAfectado),
    )
    contingencias.value.push({
      busAfectadoNumero: String(busAfectado),
      busReemplazoNumero: String(busReemplazo),
    })
    guardarContingenciasStorage(contingencias.value)
  }

  const mensaje = busReemplazo
    ? `Bus ${busAfectado} enviado a Mantenimiento. El Bus ${busReemplazo} ha sido asignado como reemplazo operativo para cubrir sus frecuencias y rutas.`
    : (reporteResponse.value?.acciones.mensaje ||
       'El incidente se registró correctamente y el bus fue actualizado.')
  const estabaAbierto = mostrarIncidente.value

  mostrarIncidente.value = false
  busConIncidente.value = null

  if (estabaAbierto) {
    showSuccess(mensaje)
  }

  await cargarBuses()
  await cargarBusesActivos()
})

async function recargarCatalogo() {
  limpiarMensajesControl()
  await Promise.all([cargarBuses(), cargarBusesActivos()])
}

function limpiarErrores() {
  limpiarErrorBuses()
  limpiarMensajesControl()
}

type AccionEstado = 'activar' | 'desactivar' | 'reactivar'

async function confirmarCambioEstado(bus: Bus, accion: AccionEstado) {
  if (!bus.id) return

  const configuracion: Record<
    AccionEstado,
    { title: string; message: string; confirmText: string }
  > = {
    activar: {
      title: 'Activar bus',
      message: `El bus ${bus.numero} volverá a estar disponible para nuevas asignaciones.`,
      confirmText: 'Activar',
    },
    desactivar: {
      title: 'Desactivar bus',
      message: `El bus ${bus.numero} dejará de estar disponible para nuevas asignaciones.`,
      confirmText: 'Desactivar',
    },
    reactivar: {
      title: 'Reactivar bus',
      message: `El bus ${bus.numero} saldrá de mantenimiento y volverá a estar disponible para operar.`,
      confirmText: 'Reactivar',
    },
  }

  const confirmado = await confirm({
    ...configuracion[accion],
    type: accion === 'desactivar' ? 'warning' : 'info',
  })

  if (!confirmado) return

  let actualizado = false

  if (accion === 'activar') {
    actualizado = Boolean(await activarBus(bus.id))
  } else if (accion === 'desactivar') {
    actualizado = Boolean(await desactivarBus(bus.id))
  } else {
    const respuesta = await reactivarBus(
      bus.id,
      identificadorReactivacion.value,
      'Reactivación manual desde el panel de flota',
    )
    actualizado = Boolean(respuesta)
  }

  if (!actualizado) {
    if (controlError.value) {
      showError(controlError.value)
      limpiarMensajesControl()
    }
    return
  }

  if (accion === 'reactivar') {
    contingencias.value = contingencias.value.filter(
      (c) => c.busAfectadoNumero !== String(bus.numero),
    )
    guardarContingenciasStorage(contingencias.value)
  }

  // Notificación de éxito consistente vía showSuccess (Toast 3s arriba a la derecha)
  const mensajeExito =
    controlSuccess.value ||
    (accion === 'desactivar'
      ? `Bus ${bus.numero} desactivado correctamente.`
      : accion === 'activar'
        ? `Bus ${bus.numero} activado correctamente.`
        : `Bus ${bus.numero} reactivado correctamente.`)
  showSuccess(mensajeExito)
  limpiarMensajesControl()

  // Se recarga el catálogo completo
  await cargarBuses()
}

onMounted(() => {
  void cargarBusesActivos()
})
</script>
