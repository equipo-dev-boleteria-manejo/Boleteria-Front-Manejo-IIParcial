<template>
  <div class="space-y-6">
    <!-- Resumen de frecuencias -->
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de frecuencias">
      <MetricCard
        v-for="tarjeta in tarjetasResumen"
        :key="tarjeta.etiqueta"
        :title="tarjeta.etiqueta"
        :value="loading && !hayFrecuencias ? '—' : tarjeta.valor"
        :icon="tarjeta.icono"
        :description="tarjeta.detalle"
        :variant="tarjeta.variant"
      />
    </section>

    <!-- Barra de Búsqueda y Filtros Unificada -->
    <div
      class="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs md:flex-row"
    >
      <div class="w-full md:w-80">
        <SearchInput
          id="frecuencia-search"
          v-model="busqueda"
          placeholder="Buscar por origen, destino o código..."
        />
      </div>

      <div class="flex w-full flex-wrap items-center justify-end gap-2.5 md:w-auto">
        <SelectFilter label="Estado:" v-model="filtroEstado" :options="OPCIONES_FILTRO_ESTADO" />

        <RefreshButton :loading="loading" @click="recargar" />

        <CreateButton label="Registrar frecuencia" @click="abrirModal" />
      </div>
    </div>

    <!-- Error al cargar sin datos previos -->
    <CardBase v-if="errorCarga && !hayFrecuencias" padding="none">
      <div class="px-5 py-12 text-center sm:px-6" role="alert" aria-live="assertive">
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl"
          aria-hidden="true"
        >
          ⚠️
        </div>
        <h3 class="mt-4 text-base font-bold text-slate-800">No pudimos cargar las frecuencias</h3>
        <p class="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">{{ errorCarga }}</p>
        <div class="mt-4 flex justify-center">
          <ButtonBase :loading="loading" @click="recargar">Reintentar</ButtonBase>
        </div>
      </div>
    </CardBase>

    <!-- Catálogo: cargando, vacío y datos -->
    <TableBase
      v-else
      :columns="columnas"
      :loading="loading && !hayFrecuencias"
      :empty="filasFiltradas.length === 0"
      :empty-icon="hayFrecuencias ? '🔍' : '⏱️'"
      :empty-title="hayFrecuencias ? 'No se encontraron frecuencias' : 'No hay frecuencias registradas'"
      :empty-description="
        hayFrecuencias
          ? 'No existen frecuencias que coincidan con la búsqueda o el estado seleccionado.'
          : 'Aún no existe ninguna frecuencia en el catálogo. Registra la primera para comenzar a programar rutas.'
      "
      aria-label="Catálogo de frecuencias y horarios ANT"
    >
      <template #empty-action>
        <ButtonBase v-if="hayFrecuencias" variant="outline" size="sm" @click="reiniciarFiltros">
          Restablecer Filtros
        </ButtonBase>
        <ButtonBase v-else @click="abrirModal">Registrar primera frecuencia</ButtonBase>
      </template>

      <tr
        v-for="fila in filasFiltradas"
        :key="fila.id"
        class="transition-colors hover:bg-blue-50/50"
      >
        <td class="px-6 py-3">
          <div class="flex items-center gap-3">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-base ring-1 ring-blue-100"
              aria-hidden="true"
            >
              ⏱️
            </div>
            <div class="min-w-0">
              <p class="text-sm font-bold leading-tight text-slate-900">{{ fila.identificador }}</p>
              <p class="text-xs text-slate-400">ANT: {{ fila.codigoAnt }}</p>
            </div>
          </div>
        </td>
        <td class="px-6 py-3">
          <p class="text-sm font-bold leading-tight text-slate-900">{{ fila.ruta }}</p>
          <p class="text-xs text-slate-400">{{ fila.tipo }}</p>
        </td>
        <td class="px-6 py-3">
          <span
            class="inline-block rounded-md border border-slate-200/80 bg-slate-50 px-2.5 py-1 font-mono text-xs font-bold text-slate-700"
          >
            {{ fila.horaSalida }}
          </span>
        </td>
        <td class="px-6 py-3">
          <span class="text-xs font-medium text-slate-700">{{ fila.dias }}</span>
        </td>
        <td class="px-6 py-3">
          <span v-if="fila.tipo === 'Directo'" class="text-xs text-slate-400">Sin paradas (servicio directo)</span>
          <span
            v-else-if="fila.faltanParadas"
            class="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700"
          >
            ⚠️ Faltan paradas
          </span>
          <template v-else>
            <span class="text-sm font-bold text-slate-900">{{ fila.totalParadas }}</span>
            <span class="text-xs text-slate-400"> · hasta la última: {{ fila.tiempoUltimaParada }}</span>
          </template>
        </td>
        <td class="px-6 py-3 text-center">
          <span
            class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-2xs"
            :class="
              fila.activa
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-100 text-slate-600'
            "
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="fila.activa ? 'bg-emerald-500' : 'bg-slate-400'"
              aria-hidden="true"
            ></span>
            {{ fila.activa ? 'Activa' : 'Inactiva' }}
          </span>
        </td>
        <td class="px-6 py-3 text-right">
          <div class="flex items-center justify-end gap-2">
            <!-- Las frecuencias directas no llevan paradas intermedias. -->
            <ActionButton
              v-if="fila.tipo !== 'Directo'"
              :action="fila.faltanParadas ? 'warning' : 'primary'"
              label="Paradas"
              :disabled="loading"
              :aria-label="`Gestionar las paradas de la frecuencia ${fila.identificador}`"
              @click="verParadas(fila.id)"
            >
              <template #icon>
                <svg
                  class="h-3.5 w-3.5"
                  :class="fila.faltanParadas ? 'text-amber-600' : 'text-blue-600'"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </template>
            </ActionButton>

            <ActionButton
              action="edit"
              label="Editar"
              :disabled="loading"
              :aria-label="`Editar la frecuencia ${fila.identificador}`"
              @click="abrirEdicion(fila)"
            />

            <ActionButton
              v-if="fila.activa"
              action="danger"
              label="Desactivar"
              :disabled="loading"
              :aria-label="`Desactivar la frecuencia ${fila.identificador}`"
              @click="cambiarEstado(fila)"
            />
            <ActionButton
              v-else
              action="success"
              label="Activar"
              :disabled="loading"
              :aria-label="`Activar la frecuencia ${fila.identificador}`"
              @click="cambiarEstado(fila)"
            />
          </div>
        </td>
      </tr>

      <template v-if="filasFiltradas.length > 0" #footer>
        <p>Los cambios de estado se reflejan automáticamente en el catálogo.</p>
        <p class="font-semibold text-slate-600">
          {{ filasFiltradas.length }} de {{ resumen.total }} frecuencias listadas
        </p>
      </template>
    </TableBase>

    <!-- Modales desacoplados -->
    <ModalCrearFrecuencia
      v-model="modalAbierto"
      :loading="loading"
      :error="modalAbierto ? error : null"
      :cooperativa-id="cooperativaId"
      :frecuencia="frecuenciaEnEdicion"
      @submit="registrar"
      @guardar="guardarCambios"
      @sin-cambios="avisarSinCambiosFrecuencia"
    />

    <ModalBase
      v-model="modalParadas"
      :title="tituloParadas"
      max-width="2xl"
      @close="cerrarParadas"
    >
      <div
        v-if="filaSeleccionada"
        class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg text-white shadow-sm shadow-blue-200"
            aria-hidden="true"
          >
            ⏱️
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Frecuencia</p>
            <p class="text-sm font-bold text-slate-900">{{ filaSeleccionada.identificador }}</p>
          </div>
        </div>

        <span
          class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600"
        >
          Salida: {{ filaSeleccionada.horaSalida }}
        </span>
      </div>

      <ListaParadasIntermedias
        :paradas="paradasSeleccionadas"
        :extremos="extremosSeleccionados"
        :orden-sugerido="ordenSugeridoParada"
        :loading="loading"
        :error="errorParadas"
        @agregar="agregarParada"
        @actualizar="actualizarParada"
        @sin-cambios="showInfo('No se realizaron cambios en la parada.')"
        @eliminar="eliminarParada"
      />

      <template #footer>
        <ButtonBase variant="secondary" @click="cerrarParadas">Cerrar</ButtonBase>
      </template>
    </ModalBase>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ActionButton from '../../Components/ActionButton.vue'
import ButtonBase from '../../Components/ButtonBase.vue'
import CardBase from '../../Components/CardBase.vue'
import CreateButton from '../../Components/CreateButton.vue'
import ListaParadasIntermedias from '../../Components/ListaParadasIntermedias.vue'
import MetricCard from '../../Components/MetricCard.vue'
import ModalBase from '../../Components/ModalBase.vue'
import ModalCrearFrecuencia from '../../Components/ModalCrearFrecuencia.vue'
import RefreshButton from '../../Components/RefreshButton.vue'
import SearchInput from '../../Components/SearchInput.vue'
import SelectFilter from '../../Components/SelectFilter.vue'
import TableBase from '../../Components/TableBase.vue'
import { useFeedback } from '../../Composables/useFeedback'
import { useFrecuencias, type FilaFrecuencia } from '../../Composables/useFrecuencias'
import {
  OPCIONES_FILTRO_ESTADO,
  eliminaParadasAlGuardar,
  type DatosEdicionFrecuencia,
} from '../../Composables/presentacionFrecuencias'
import { useAuthStore } from '../../Store/authStore'
import type { Frecuencia } from '../../../Domain/Entities/Frecuencia'
import type {
  ActualizarFrecuenciaDto,
  CrearFrecuenciaDto,
  ParadaIntermediaDto,
} from '../../../Application/Dtos/CrearFrecuenciaDto'

const {
  loading,
  error,
  filaSeleccionada,
  paradasSeleccionadas,
  ordenSugeridoParada,
  resumen,
  busqueda,
  filtroEstado,
  filasFiltradas,
  reiniciarFiltros,
  cargarFrecuencias,
  seleccionarFrecuencia,
  limpiarSeleccion,
  registrarFrecuencia,
  guardarFrecuencia,
  obtenerDatosEdicion,
  activarFrecuencia,
  desactivarFrecuencia,
  agregarParadaAFrecuencia,
  actualizarParada: actualizarParadaDeFrecuencia,
  eliminarParada: eliminarParadaDeFrecuencia,
  limpiarError,
} = useFrecuencias()

const authStore = useAuthStore()
const { showSuccess, showError, showInfo, showWarning, confirm } = useFeedback()

// Misma convención que BusesAdmin: si la sesión no trae cooperativa se usa la 1.
const cooperativaId = computed(() => authStore.user?.cooperativaId ?? 1)

// Estado exclusivamente de interfaz (apertura de paneles).
const modalAbierto = ref(false)
const frecuenciaEnEdicion = ref<DatosEdicionFrecuencia | null>(null)
const idEnEdicion = ref<number | null>(null)
const modalParadas = ref(false)
const errorParadas = ref<string | null>(null)

const hayFrecuencias = computed(() => resumen.value.total > 0)

// El error del composable es compartido: solo se muestra en el catálogo cuando no hay un modal abierto.
const errorCarga = computed(() => (modalAbierto.value || modalParadas.value ? null : error.value))

const extremosSeleccionados = computed(() =>
  filaSeleccionada.value ? [filaSeleccionada.value.origen, filaSeleccionada.value.destino] : [],
)

const tituloParadas = computed(() =>
  filaSeleccionada.value ? `Paradas · ${filaSeleccionada.value.ruta}` : 'Paradas intermedias',
)

const columnas = [
  { key: 'frecuencia', label: 'Frecuencia' },
  { key: 'ruta', label: 'Ruta' },
  { key: 'salida', label: 'Salida' },
  { key: 'dias', label: 'Días' },
  { key: 'paradas', label: 'Paradas' },
  { key: 'estado', label: 'Estado', align: 'center' as const },
  { key: 'acciones', label: 'Acciones', align: 'right' as const },
]

const tarjetasResumen = computed(() => [
  {
    etiqueta: 'Total frecuencias',
    valor: resumen.value.total,
    detalle: 'Plantillas registradas',
    icono: '🕒',
    variant: 'default' as const,
  },
  {
    etiqueta: 'Activas',
    valor: resumen.value.activas,
    detalle: 'Disponibles para programar',
    icono: '✅',
    variant: 'success' as const,
  },
  {
    etiqueta: 'Inactivas',
    valor: resumen.value.inactivas,
    detalle: 'Fuera de operación',
    icono: '⛔',
    variant: 'danger' as const,
  },
  {
    etiqueta: 'Con paradas',
    valor: resumen.value.conParadas,
    detalle: 'Con paradas intermedias',
    icono: '📍',
    variant: 'info' as const,
  },
])

/** El composable guarda el mensaje en `error`; la vista no necesita relanzar la excepción. */
async function ignorandoError(accion: () => Promise<unknown>): Promise<boolean> {
  try {
    await accion()
    return true
  } catch {
    return false
  }
}

async function recargar() {
  const cargada = await ignorandoError(() => cargarFrecuencias())
  if (!cargada && hayFrecuencias.value) {
    showError(error.value ?? 'No se pudieron actualizar las frecuencias.')
  }
}

function abrirModal() {
  limpiarError()
  frecuenciaEnEdicion.value = null
  idEnEdicion.value = null
  modalAbierto.value = true
}

function abrirEdicion(fila: FilaFrecuencia) {
  const datos = obtenerDatosEdicion(fila.id)
  if (!datos) {
    showError('No se encontró la frecuencia seleccionada. Actualiza la lista e inténtalo de nuevo.')
    return
  }
  limpiarError()
  frecuenciaEnEdicion.value = datos
  idEnEdicion.value = fila.id
  modalAbierto.value = true
}

function avisarSinCambiosFrecuencia() {
  modalAbierto.value = false
  showInfo(`No se realizaron cambios en la frecuencia ${frecuenciaEnEdicion.value?.identificadorFrecuencia ?? ''}.`.replace(' .', '.'))
}

async function guardarCambios(cambios: ActualizarFrecuenciaDto) {
  if (idEnEdicion.value === null) return
  const identificador = frecuenciaEnEdicion.value?.identificadorFrecuencia ?? ''
  const datos = frecuenciaEnEdicion.value

  if (datos && eliminaParadasAlGuardar(datos, cambios)) {
    const paradas = datos.totalParadas === 1 ? 'la parada intermedia' : `las ${datos.totalParadas} paradas intermedias`
    const confirmado = await confirm({
      title: 'Convertir en frecuencia directa',
      message: `Se eliminarán ${paradas} de la frecuencia ${identificador}, porque una frecuencia directa no las lleva. Esta acción no se puede deshacer.`,
      type: 'warning',
      confirmText: 'Convertir y eliminar paradas',
    })
    if (!confirmado) return
  }

  const resultado: { frecuencia?: Frecuencia } = {}
  const guardada = await ignorandoError(async () => {
    resultado.frecuencia = await guardarFrecuencia(idEnEdicion.value as number, cambios)
  })
  if (guardada) {
    modalAbierto.value = false
    showSuccess(`Frecuencia ${identificador} actualizada correctamente.`)
    if (resultado.frecuencia?.estaIncompleta()) {
      showWarning(`La frecuencia ${identificador} no tiene paradas: quedó inactiva hasta que agregues al menos una.`)
    }
  } else {
    showError(error.value ?? 'No se pudo actualizar la frecuencia.')
  }
}

async function registrar(dto: CrearFrecuenciaDto) {
  const resultado: { frecuencia?: Frecuencia } = {}
  const registrada = await ignorandoError(async () => {
    resultado.frecuencia = await registrarFrecuencia(dto)
  })
  if (registrada) {
    const identificador = dto.identificadorFrecuencia.trim()
    modalAbierto.value = false
    showSuccess(`Frecuencia ${identificador} registrada correctamente.`)
    if (resultado.frecuencia?.estaIncompleta()) {
      showWarning(`La frecuencia ${identificador} quedó inactiva: agrégale al menos una parada para activarla.`)
    }
  } else {
    showError(error.value ?? 'No se pudo registrar la frecuencia.')
  }
}

async function verParadas(id: number) {
  errorParadas.value = null
  const seleccionada = await ignorandoError(() => seleccionarFrecuencia(id))
  if (seleccionada) {
    modalParadas.value = true
  } else {
    showError(error.value ?? 'No se pudo cargar la frecuencia.')
  }
}

function cerrarParadas() {
  modalParadas.value = false
  errorParadas.value = null
  limpiarSeleccion()
}

async function cambiarEstado(fila: FilaFrecuencia) {
  const activar = !fila.activa
  if (activar && fila.faltanParadas) {
    showError(`Agrega al menos una parada a la frecuencia ${fila.identificador} antes de activarla.`)
    return
  }
  const confirmado = await confirm({
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
    showSuccess(`Frecuencia ${fila.identificador} ${activar ? 'activada' : 'desactivada'}.`)
  } else {
    showError(error.value ?? 'No se pudo cambiar el estado de la frecuencia.')
  }
}

async function agregarParada(dto: ParadaIntermediaDto) {
  if (!filaSeleccionada.value) return
  errorParadas.value = null
  const frecuenciaId = filaSeleccionada.value.id
  const agregada = await ignorandoError(() => agregarParadaAFrecuencia(frecuenciaId, dto))
  if (agregada) {
    showSuccess('Parada agregada a la frecuencia.')
  } else {
    errorParadas.value = error.value
    showError(error.value ?? 'No se pudo agregar la parada.')
  }
}

async function actualizarParada({ id, cambios }: { id: number; cambios: ParadaIntermediaDto }) {
  errorParadas.value = null
  const actualizada = await ignorandoError(() => actualizarParadaDeFrecuencia(id, cambios))
  if (actualizada) {
    showSuccess('Parada actualizada correctamente.')
  } else {
    errorParadas.value = error.value
    showError(error.value ?? 'No se pudo actualizar la parada.')
  }
}

async function eliminarParada(paradaId: number) {
  // Si es la única parada de una frecuencia activa con paradas, quedará incompleta e inactiva.
  const quedaraIncompleta =
    paradasSeleccionadas.value.length === 1 &&
    filaSeleccionada.value?.tipo !== 'Directo' &&
    filaSeleccionada.value?.activa === true
  const confirmado = await confirm({
    title: 'Eliminar parada',
    message: quedaraIncompleta
      ? 'Es la única parada de la frecuencia. Al eliminarla quedará incompleta y se desactivará hasta que agregues al menos una.'
      : 'La parada se quitará de la frecuencia. Esta acción no se puede deshacer.',
    type: 'warning',
    confirmText: 'Eliminar',
  })
  if (!confirmado) return

  errorParadas.value = null
  const eliminada = await ignorandoError(() => eliminarParadaDeFrecuencia(paradaId))
  if (eliminada) {
    showSuccess('Parada eliminada de la frecuencia.')
    if (quedaraIncompleta) {
      showWarning('La frecuencia quedó sin paradas y se desactivó hasta que agregues al menos una.')
    }
  } else {
    errorParadas.value = error.value
    showError(error.value ?? 'No se pudo eliminar la parada.')
  }
}

onMounted(() => {
  void recargar()
})
</script>
