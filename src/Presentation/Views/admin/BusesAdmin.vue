<template>
  <div class="space-y-6">
    <!-- Encabezado de la vista -->
    <section
      class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-lg sm:p-8"
    >
      <div
        class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl"
        aria-hidden="true"
      ></div>
      <div
        class="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl"
        aria-hidden="true"
      ></div>

      <div class="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div class="max-w-2xl">
          <span
            class="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-100"
          >
            Semana 3 · Capa de presentación
          </span>
          <h1 class="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Flota y Buses</h1>
          <p class="mt-2 text-sm leading-relaxed text-slate-300">
            Catálogo y gestión operativa de la flota. Consulta disponibilidad, actualiza datos
            técnicos y reporta incidentes desde un único panel.
          </p>

          <div class="mt-4 flex flex-wrap gap-2">
            <span class="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-200">
              Catálogo
            </span>
            <span class="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-200">
              Estado operativo
            </span>
            <span class="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-200">
              Incidentes
            </span>
          </div>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <ButtonBase
            variant="secondary"
            :loading="cargandoCatalogo"
            @click="recargarCatalogo"
          >
            Actualizar catálogo
          </ButtonBase>
          <ButtonBase
            variant="primary"
            :aria-expanded="mostrarNuevoBus"
            aria-controls="panel-registrar-bus"
            @click="alternarNuevoBus"
          >
            {{ mostrarNuevoBus ? 'Ocultar formulario' : '+ Registrar bus' }}
          </ButtonBase>
        </div>
      </div>
    </section>

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

    <!-- Éxito de operaciones de control -->
    <div
      v-if="controlSuccess"
      role="status"
      aria-live="polite"
      class="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-sm"
    >
      <div class="flex items-start gap-2.5">
        <span class="text-base" aria-hidden="true">✅</span>
        <div>
          <p class="font-bold">Operación exitosa</p>
          <p class="mt-0.5 text-xs leading-relaxed">{{ controlSuccess }}</p>
        </div>
      </div>
      <button
        type="button"
        class="rounded-lg p-1 text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-800"
        aria-label="Cerrar notificación de éxito"
        @click="limpiarMensajesControl"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>

    <!-- Resumen de la flota -->
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de la flota">
      <div
        v-for="tarjeta in tarjetasResumen"
        :key="tarjeta.etiqueta"
        class="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {{ tarjeta.etiqueta }}
            </p>
            <p class="mt-1 text-2xl font-black text-slate-900">
              {{ busesLoading && !buses.length ? '—' : tarjeta.valor }}
            </p>
          </div>
          <span
            class="flex h-9 w-9 items-center justify-center rounded-xl border text-base"
            :class="tarjeta.tono"
            aria-hidden="true"
          >
            {{ tarjeta.icono }}
          </span>
        </div>
        <p class="mt-1 text-[11px] text-slate-500">{{ tarjeta.detalle }}</p>
      </div>
    </section>

    <!-- Catálogo -->
    <CardBase padding="none">
      <template #header>
        <div
          class="flex w-full flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <div>
            <h2 class="text-base font-bold text-slate-900">Catálogo de flota</h2>
            <p class="mt-0.5 text-xs text-slate-500">
              {{ resumenFlota.total }} unidades registradas · datos actualizados desde la capa de
              aplicación
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true"></span>
              {{ resumenFlota.activos }} activos
            </span>
            <ButtonBase
              size="sm"
              variant="outline"
              :loading="cargandoCatalogo"
              @click="recargarCatalogo"
            >
              Recargar
            </ButtonBase>
          </div>
        </div>
      </template>

      <!-- Formulario de registro -->
      <div
        v-if="mostrarNuevoBus"
        id="panel-registrar-bus"
        class="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Registrar nuevo bus</h3>
            <p class="mt-0.5 text-xs text-slate-500">
              Completa los datos básicos del vehículo. La validación se ejecuta en la capa de
              aplicación.
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
            aria-label="Cerrar formulario de registro"
            @click="cerrarNuevoBus"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <form
          class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          @submit.prevent="manejarRegistrarBus"
        >
          <InputBase
            id="nuevo-bus-numero"
            label="Número de bus"
            placeholder="Ej. 25"
            :model-value="nuevoBus.numero"
            :disabled="busesLoading"
            @update:model-value="nuevoBus.numero = $event"
          />

          <InputBase
            id="nuevo-bus-placa"
            label="Placa"
            placeholder="Ej. PBA-1234"
            :model-value="nuevoBus.placa"
            :disabled="busesLoading"
            @update:model-value="nuevoBus.placa = $event"
          />

          <InputBase
            id="nuevo-bus-asientos"
            label="Capacidad total"
            type="number"
            :model-value="nuevoBus.totalAsientos"
            :disabled="busesLoading"
            @update:model-value="onTotalAsientosNuevo"
          />

          <div class="space-y-1.5">
            <label
              for="nuevo-bus-estructura"
              class="block text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              Estructura
            </label>
            <select
              id="nuevo-bus-estructura"
              :value="nuevoBus.estructura"
              :disabled="busesLoading"
              class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              @change="onEstructuraNueva"
            >
              <option value="UnPiso">Un piso</option>
              <option value="DosPisos">Dos pisos</option>
            </select>
          </div>

          <div class="flex justify-end gap-2 sm:col-span-2 xl:col-span-4">
            <ButtonBase variant="secondary" :disabled="busesLoading" @click="cerrarNuevoBus">
              Cancelar
            </ButtonBase>
            <ButtonBase type="submit" :loading="busesLoading" :disabled="cargandoGeneral">
              Registrar bus
            </ButtonBase>
          </div>
        </form>
      </div>

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

      <!-- Estado vacío -->
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

      <!-- Éxito / datos -->
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[860px] border-collapse text-left">
          <caption class="sr-only">
            Catálogo de buses con número, placa, capacidad, estructura, estado y acciones
          </caption>
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th scope="col" class="px-5 py-3 sm:px-6">Bus</th>
              <th scope="col" class="px-4 py-3">Placa</th>
              <th scope="col" class="px-4 py-3">Capacidad</th>
              <th scope="col" class="px-4 py-3">Estructura</th>
              <th scope="col" class="px-4 py-3">Estado</th>
              <th scope="col" class="px-5 py-3 text-right sm:px-6">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="bus in buses"
              :key="bus.id ?? bus.placa"
              class="transition-colors hover:bg-slate-50/80"
            >
              <td class="px-5 py-3.5 sm:px-6">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-base"
                    aria-hidden="true"
                  >
                    🚌
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-bold text-slate-900">Bus {{ bus.numero }}</p>
                    <p class="truncate text-[11px] text-slate-400">
                      {{ bus.marcaChasis || 'Marca no registrada' }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3.5">
                <span class="font-mono text-xs font-semibold text-slate-700">{{ bus.placa }}</span>
              </td>
              <td class="px-4 py-3.5">
                <span class="text-sm font-semibold text-slate-700">{{ bus.totalAsientos }}</span>
                <span class="text-[11px] text-slate-400"> asientos</span>
              </td>
              <td class="px-4 py-3.5">
                <span class="text-xs text-slate-600">{{ estructuraLabel(bus.estructura) }}</span>
              </td>
              <td class="px-4 py-3.5">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                  :class="estadoInfo(bus.estado).badge"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full"
                    :class="estadoInfo(bus.estado).dot"
                    aria-hidden="true"
                  ></span>
                  {{ estadoInfo(bus.estado).label }}
                </span>
              </td>
              <td class="px-5 py-3.5 sm:px-6">
                <div class="flex flex-wrap items-center justify-end gap-2">
                  <ButtonBase
                    size="sm"
                    variant="outline"
                    :disabled="cargandoCatalogo"
                    :aria-label="`Editar bus ${bus.numero}`"
                    @click="abrirEdicion(bus)"
                  >
                    Editar
                  </ButtonBase>

                  <ButtonBase
                    size="sm"
                    variant="secondary"
                    :disabled="cargandoCatalogo"
                    :aria-label="`Reportar incidente del bus ${bus.numero}`"
                    @click="abrirReporte(bus)"
                  >
                    Incidente
                  </ButtonBase>

                  <ButtonBase
                    v-if="puedeDesactivar(bus)"
                    size="sm"
                    variant="danger"
                    :disabled="cargandoCatalogo"
                    :aria-label="`Desactivar bus ${bus.numero}`"
                    @click="confirmarCambioEstado(bus, 'desactivar')"
                  >
                    Desactivar
                  </ButtonBase>

                  <ButtonBase
                    v-else-if="puedeActivar(bus)"
                    size="sm"
                    variant="success"
                    :disabled="cargandoCatalogo"
                    :aria-label="`Activar bus ${bus.numero}`"
                    @click="confirmarCambioEstado(bus, 'activar')"
                  >
                    Activar
                  </ButtonBase>

                  <ButtonBase
                    v-else-if="puedeReactivar(bus)"
                    size="sm"
                    variant="primary"
                    :disabled="cargandoCatalogo"
                    :aria-label="`Reactivar bus ${bus.numero}`"
                    @click="confirmarCambioEstado(bus, 'reactivar')"
                  >
                    Reactivar
                  </ButtonBase>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <template #footer>
        <div
          class="flex w-full flex-col gap-2 px-5 pb-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <p>Los cambios de estado se reflejan automáticamente en el catálogo.</p>
          <p class="font-semibold text-slate-600">{{ buses.length }} buses listados</p>
        </div>
      </template>
    </CardBase>

    <!-- Modales desacoplados -->
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
import InputBase from '../../Components/InputBase.vue'
import EditarBusModal from '../../Components/EditarBusModal.vue'
import ReportarIncidenteModal from '../../Components/ReportarIncidenteModal.vue'
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

// Estado exclusivamente de interfaz (apertura de paneles y selección de fila).
const mostrarNuevoBus = ref(false)
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
    tono: 'border-blue-100 bg-blue-50 text-blue-700',
  },
  {
    etiqueta: 'Activos',
    valor: resumenFlota.value.activos,
    detalle: 'Disponibles para operar',
    icono: '✅',
    tono: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  },
  {
    etiqueta: 'Mantenimiento',
    valor: resumenFlota.value.mantenimiento,
    detalle: 'Fuera de operación temporal',
    icono: '🛠️',
    tono: 'border-amber-100 bg-amber-50 text-amber-700',
  },
  {
    etiqueta: 'Fuera de servicio',
    valor: resumenFlota.value.fueraServicio,
    detalle: 'Requieren revisión técnica',
    icono: '⛔',
    tono: 'border-red-100 bg-red-50 text-red-700',
  },
])

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

const busesReemplazo = computed(() =>
  busesDisponibles.value.filter((bus) => bus.numero !== busConIncidente.value?.numero),
)

function actualizarFormIncidente(patch: Partial<FormIncidente>) {
  Object.assign(formIncidente, patch)
}

function alternarNuevoBus() {
  mostrarNuevoBus.value = !mostrarNuevoBus.value
}

function abrirNuevoBus() {
  mostrarNuevoBus.value = true
}

function cerrarNuevoBus() {
  mostrarNuevoBus.value = false
}

function onTotalAsientosNuevo(value: string) {
  nuevoBus.value.totalAsientos = value === '' ? 0 : Number(value)
}

function onEstructuraNueva(event: Event) {
  nuevoBus.value.estructura = (event.target as HTMLSelectElement).value as EstructuraBus
}

async function manejarRegistrarBus() {
  const numero = nuevoBus.value.numero
  const exito = await registrarBus()

  if (!exito) return

  mostrarNuevoBus.value = false
  uiStore.showAlert({
    type: 'success',
    title: 'Bus registrado',
    message: `El bus ${numero || 'nuevo'} se agregó correctamente al catálogo de flota.`,
  })
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
  uiStore.showAlert({
    type: 'success',
    title: 'Bus actualizado',
    message: `Los datos del bus ${payload.numero} se actualizaron correctamente.`,
  })
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

async function manejarReportarIncidente() {
  await reportarIncidente()
}

function cerrarReporte() {
  mostrarIncidente.value = false
  busConIncidente.value = null
  reiniciarReporte()
}

watch(reporteSuccess, async (exito) => {
  if (!exito) return

  const mensaje =
    reporteResponse.value?.acciones.mensaje ||
    'El incidente se registró correctamente y el bus fue actualizado.'
  const estabaAbierto = mostrarIncidente.value

  mostrarIncidente.value = false
  busConIncidente.value = null

  if (estabaAbierto) {
    uiStore.showAlert({
      type: 'success',
      title: 'Incidente registrado',
      message: mensaje,
    })
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

  const confirmado = await uiStore.showConfirm({
    ...configuracion[accion],
    type: accion === 'desactivar' ? 'warning' : 'info',
    cancelText: 'Cancelar',
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

  if (!actualizado) return

  // Se recarga el catálogo completo; el mensaje de éxito proviene de useControlBuses.
  await cargarBuses()
}

onMounted(() => {
  void cargarBusesActivos()
})
</script>
