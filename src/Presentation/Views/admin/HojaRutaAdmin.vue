<template>
  <div class="space-y-6">
    <!-- Encabezado Principal con CardBase -->
    <CardBase
      title="Control y Despacho de Hojas de Ruta"
      subtitle="Programación operativa diaria: asignación de buses a frecuencias y control de bitácoras"
      padding="lg"
    >
      <template #header-action>
        <div class="flex items-center gap-2">
          <ButtonBase
            variant="secondary"
            size="sm"
            :disabled="loading"
            @click="consultarPlan"
          >
            <span>🔄</span>
            <span>Consultar Plan</span>
          </ButtonBase>
          <ButtonBase
            v-if="hojasRuta.length === 0"
            variant="primary"
            size="sm"
            :disabled="loading"
            @click="handleCrearHojaDia"
          >
            <span>📋</span>
            <span>Crear Hoja del Día</span>
          </ButtonBase>
        </div>
      </template>

      <!-- Selector de Fecha Operativa -->
      <div class="flex flex-col sm:flex-row sm:items-end gap-3 pt-2">
        <div class="w-full sm:w-64 space-y-1.5">
          <label for="fecha-filtro-hoja" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Fecha de Operación
          </label>
          <input
            id="fecha-filtro-hoja"
            v-model="fechaFiltro"
            type="date"
            class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            @change="consultarPlan"
          />
        </div>

        <div class="flex items-center gap-2">
          <ButtonBase
            variant="primary"
            size="md"
            :loading="loading"
            @click="consultarPlan"
          >
            Buscar Bitácora
          </ButtonBase>
        </div>
      </div>
    </CardBase>

    <!-- Formulario: Asignar Nuevo Trayecto -->
    <CardBase
      title="Asignar Nuevo Trayecto Operativo"
      subtitle="Vincula una unidad disponible a una frecuencia programada para la fecha seleccionada"
      padding="md"
    >
      <form id="form-asignar-trayecto" class="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-end" @submit.prevent="handleAsignarTrayecto">
        <!-- Frecuencia -->
        <div class="space-y-1.5">
          <label for="select-frecuencia-hoja" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Frecuencia / Horario <span class="text-red-500">*</span>
          </label>
          <select
            id="select-frecuencia-hoja"
            v-model="form.frecuenciaId"
            required
            :disabled="loading || frecuencias.length === 0"
            class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="" disabled>Seleccione una frecuencia</option>
            <option v-for="f in frecuencias" :key="f.id || f.identificador" :value="f.id">
              {{ f.ciudadOrigen }} → {{ f.ciudadDestino }} ({{ f.horaSalida }})
            </option>
          </select>
        </div>

        <!-- Bus -->
        <div class="space-y-1.5">
          <label for="select-bus-hoja" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Unidad / Bus <span class="text-red-500">*</span>
          </label>
          <select
            id="select-bus-hoja"
            v-model="form.busId"
            required
            :disabled="loading || buses.length === 0"
            class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="" disabled>Seleccione un bus</option>
            <option v-for="b in buses" :key="b.id || b.numero" :value="b.id">
              Bus #{{ b.numero }} ({{ b.placa }})
            </option>
          </select>
        </div>

        <!-- Botón Asignar -->
        <div>
          <ButtonBase
            type="submit"
            form="form-asignar-trayecto"
            variant="primary"
            size="md"
            full-width
            :loading="loading"
            :disabled="loading || !form.frecuenciaId || !form.busId"
          >
            Vincular al Plan
          </ButtonBase>
        </div>
      </form>
    </CardBase>

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
      <ButtonBase variant="secondary" size="sm" @click="consultarPlan">
        Reintentar
      </ButtonBase>
    </div>

    <!-- 2. Estado de Carga (Loading) -->
    <div
      v-if="loading && hojasRuta.length === 0"
      role="status"
      aria-label="Cargando hojas de ruta"
      class="rounded-2xl bg-white p-8 border border-slate-200/80 shadow-sm space-y-4"
    >
      <div class="h-6 bg-slate-200 rounded w-1/3 animate-pulse"></div>
      <div class="space-y-3">
        <div class="h-16 bg-slate-100 rounded-xl animate-pulse"></div>
        <div class="h-16 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <p class="text-center text-xs text-slate-400 font-medium pt-2">Cargando hojas de ruta operativas...</p>
    </div>

    <!-- 3. Estado Vacío (Empty State) -->
    <div
      v-else-if="!loading && hojasRuta.length === 0"
      class="rounded-2xl bg-white p-12 text-center border border-slate-200/80 shadow-sm space-y-3"
    >
      <div class="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center text-3xl mx-auto">
        📋
      </div>
      <h3 class="text-base font-bold text-slate-800">Sin programación activa para esta fecha</h3>
      <p class="text-xs text-slate-500 max-w-sm mx-auto">
        No se encontró ninguna hoja de ruta registrada para el día {{ fechaFiltro }}.
        Vincula un trayecto o genera la hoja del día directamente.
      </p>
      <div class="pt-2">
        <ButtonBase
          variant="primary"
          size="sm"
          @click="handleCrearHojaDia"
        >
          Crear Hoja del Día Ahora
        </ButtonBase>
      </div>
    </div>

    <!-- 4. Estado con Datos (Success / Data) -->
    <div v-else class="space-y-6">
      <div
        v-for="hoja in hojasRuta"
        :key="hoja.id"
        class="space-y-4"
      >
        <!-- Encabezado de la Hoja de Ruta -->
        <div class="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-lg font-bold border border-blue-100">
              #{{ hoja.id }}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-bold text-slate-900">
                  Hoja de Ruta #{{ hoja.id }}
                </h3>
                <span
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                  :class="getEstadoBadgeClass(hoja.estado)"
                >
                  {{ hoja.estado }}
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                Fecha Operativa: <strong class="text-slate-600 font-mono">{{ hoja.fecha }}</strong> | Tipo: {{ hoja.tipoGeneracion || 'Manual' }}
              </p>
            </div>
          </div>

          <!-- Acciones de Estado de la Hoja -->
          <div class="flex items-center gap-2">
            <ButtonBase
              v-if="hoja.estado === EstadoHojaRuta.BORRADOR"
              variant="success"
              size="sm"
              :disabled="loading"
              @click="handleIniciarHoja(hoja)"
            >
              Iniciar Operación
            </ButtonBase>

            <ButtonBase
              v-if="hoja.estado === EstadoHojaRuta.EMITIDA"
              variant="primary"
              size="sm"
              :disabled="loading"
              @click="handleFinalizarHoja(hoja)"
            >
              Cerrar Hoja
            </ButtonBase>

            <ButtonBase
              v-if="hoja.estado !== EstadoHojaRuta.CERRADA"
              variant="danger"
              size="sm"
              :disabled="loading"
              @click="handleCancelarHoja(hoja)"
            >
              Cancelar Hoja
            </ButtonBase>
          </div>
        </div>

        <!-- Lista de Trayectos Asignados a la Hoja -->
        <TripList
          :rutas="hoja.rutas || []"
          :readonly="hoja.estado === EstadoHojaRuta.CERRADA"
          @toggle-directo="(r) => onToggleDirecto(r)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import CardBase from '../../Components/CardBase.vue'
import ButtonBase from '../../Components/ButtonBase.vue'
import TripList from '../../Components/HojaRuta/TripList.vue'
import { useHojaRuta } from '../../Composables/useHojaRuta'
import { useRutas } from '../../Composables/useRutas'
import { useUiStore } from '../../Store/uiStore'
import { EstadoHojaRuta } from '../../../Domain/Constants/EstadosSistema'
import type { HojaRuta } from '../../../Domain/Entities/HojaRuta'
import type { Ruta } from '../../../Domain/Entities/Ruta'
import { mensajeErrorParaUsuario } from '../../Utils/errorMessage'

const hoy = new Date().toISOString().slice(0, 10)
const fechaFiltro = ref(hoy)
const uiStore = useUiStore()

const form = reactive({
  frecuenciaId: '' as number | '',
  busId: '' as number | '',
})

const {
  hojasRuta,
  loading,
  error,
  cargarPorFecha,
  crearHojaDia,
  agregarTrayecto,
  iniciarHoja,
  finalizarHoja,
  cancelarHoja,
  toggleTipoRuta,
} = useHojaRuta()

const {
  buses,
  frecuencias,
  cargarBuses,
  cargarFrecuencias,
} = useRutas()

onMounted(async () => {
  await Promise.all([
    consultarPlan(),
    cargarBuses(),
    cargarFrecuencias(),
  ])
})

async function consultarPlan() {
  try {
    await cargarPorFecha(fechaFiltro.value)
  } catch {
    // error reflejado en ref reactivo error
  }
}

async function handleCrearHojaDia() {
  try {
    await crearHojaDia(fechaFiltro.value)
    uiStore.showAlert({
      title: 'Hoja Creada',
      message: `Se ha generado la hoja de ruta para la fecha ${fechaFiltro.value}.`,
      type: 'success',
    })
  } catch (err: unknown) {
    uiStore.showAlert({
      title: 'Error al Crear',
      message: mensajeErrorParaUsuario(err, 'No se pudo crear la hoja de ruta.'),
      type: 'error',
    })
  }
}

async function handleAsignarTrayecto() {
  if (!form.frecuenciaId || !form.busId) {
    uiStore.showAlert({
      title: 'Validación Requerida',
      message: 'Debes seleccionar una frecuencia y un bus para vincular el trayecto.',
      type: 'warning',
    })
    return
  }

  const ok = await agregarTrayecto(
    Number(form.busId),
    Number(form.frecuenciaId),
    fechaFiltro.value,
  )

  if (ok) {
    uiStore.showAlert({
      title: 'Trayecto Asignado',
      message: 'El bus ha sido vinculado con éxito a la frecuencia en la hoja operativa.',
      type: 'success',
    })
    form.frecuenciaId = ''
    form.busId = ''
  } else {
    uiStore.showAlert({
      title: 'Conflicto Operativo',
      message: error.value || 'No se pudo asignar el trayecto a la hoja.',
      type: 'error',
    })
  }
}

async function handleIniciarHoja(hoja: HojaRuta) {
  if (!hoja.id) return
  const confirm = await uiStore.showConfirm({
    title: 'Iniciar Operación',
    message: `¿Confirmas el inicio de operación para la Hoja de Ruta #${hoja.id}?`,
    type: 'info',
  })

  if (confirm) {
    try {
      await iniciarHoja(hoja.id, fechaFiltro.value)
      uiStore.showAlert({
        title: 'Operación Iniciada',
        message: 'La hoja de ruta ha sido emitida y se encuentra activa.',
        type: 'success',
      })
    } catch (err: unknown) {
      uiStore.showAlert({
        title: 'Error',
        message: mensajeErrorParaUsuario(err, 'No se pudo iniciar la hoja de ruta.'),
        type: 'error',
      })
    }
  }
}

async function handleFinalizarHoja(hoja: HojaRuta) {
  if (!hoja.id) return
  const confirm = await uiStore.showConfirm({
    title: 'Cerrar Hoja de Ruta',
    message: `¿Confirmas el cierre de la Hoja #${hoja.id}? Esta acción completará todos los trayectos pendientes.`,
    type: 'warning',
  })

  if (confirm) {
    try {
      await finalizarHoja(hoja.id, fechaFiltro.value)
      uiStore.showAlert({
        title: 'Hoja Cerrada',
        message: 'La hoja de ruta ha sido cerrada y finalizada con éxito.',
        type: 'success',
      })
    } catch (err: unknown) {
      uiStore.showAlert({
        title: 'Error',
        message: mensajeErrorParaUsuario(err, 'No se pudo cerrar la hoja de ruta.'),
        type: 'error',
      })
    }
  }
}

async function handleCancelarHoja(hoja: HojaRuta) {
  if (!hoja.id) return
  const confirm = await uiStore.showConfirm({
    title: 'Cancelar Hoja de Ruta',
    message: `¿Estás seguro de cancelar la Hoja #${hoja.id} y todos sus viajes asociados?`,
    type: 'danger',
  })

  if (confirm) {
    try {
      await cancelarHoja(hoja.id, 'Cancelada por el supervisor', fechaFiltro.value)
      uiStore.showAlert({
        title: 'Hoja Cancelada',
        message: 'La hoja de ruta ha sido cancelada.',
        type: 'warning',
      })
    } catch (err: unknown) {
      uiStore.showAlert({
        title: 'Error',
        message: mensajeErrorParaUsuario(err, 'No se pudo cancelar la hoja de ruta.'),
        type: 'error',
      })
    }
  }
}

async function onToggleDirecto(ruta: Ruta) {
  await toggleTipoRuta(ruta, fechaFiltro.value)
}

function getEstadoBadgeClass(estado: string): string {
  switch (estado) {
    case EstadoHojaRuta.BORRADOR:
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case EstadoHojaRuta.EMITIDA:
      return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
    case EstadoHojaRuta.CERRADA:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}
</script>
