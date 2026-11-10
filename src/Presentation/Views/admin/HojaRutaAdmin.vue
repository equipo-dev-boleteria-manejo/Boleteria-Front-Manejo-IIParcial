<template>
  <div class="space-y-6">
    <!-- Resumen de la programación del día -->
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de la hoja de ruta">
      <MetricCard
        v-for="tarjeta in tarjetasResumen"
        :key="tarjeta.etiqueta"
        :title="tarjeta.etiqueta"
        :value="loading && hojasRuta.length === 0 ? '—' : tarjeta.valor"
        :icon="tarjeta.icono"
        :description="tarjeta.detalle"
        :variant="tarjeta.variant"
      />
    </section>

    <!-- Barra unificada: fecha de operación y acciones -->
    <div
      class="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs md:flex-row md:items-end"
    >
      <InputBase
        id="fecha-filtro-hoja"
        v-model="fechaOperacion.formulario.valor"
        label="Fecha de operación"
        type="date"
        container-class="w-full md:w-64"
        :error="fechaOperacion.error.value"
      />

      <div class="flex w-full flex-wrap items-end justify-end gap-2.5 md:w-auto">
        <RefreshButton label="Consultar plan" :loading="loading" @click="consultarPlan" />
        <CreateButton
          v-if="hojasRuta.length === 0"
          label="Crear hoja del día"
          :loading="loading"
          @click="handleCrearHojaDia"
        />
      </div>
    </div>

    <!-- Formulario: asignar un nuevo trayecto a la hoja -->
    <CardBase
      title="Asignar nuevo trayecto"
      subtitle="Vincula una unidad disponible a una frecuencia activa para la fecha seleccionada"
      padding="md"
    >
      <!-- Una hoja cerrada o cancelada es definitiva: se explica antes de que el usuario llene el formulario. -->
      <div
        v-if="!admiteTrayectos"
        role="status"
        class="mb-3.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-medium text-amber-800"
      >
        ⚠️ La hoja de ruta de esta fecha está cerrada o cancelada y ya no admite más trayectos. Elige otra fecha
        para programar nuevos viajes.
      </div>

      <form
        id="form-asignar-trayecto"
        class="grid grid-cols-1 items-start gap-3.5 md:grid-cols-3"
        novalidate
        @submit.prevent="handleAsignarTrayecto"
      >
        <div class="space-y-1.5">
          <label for="select-frecuencia-hoja" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Frecuencia / Horario <span class="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="select-frecuencia-hoja"
            v-model="trayecto.formulario.frecuenciaId"
            :disabled="loading || !admiteTrayectos || frecuenciasActivas.length === 0"
            :aria-invalid="Boolean(trayecto.erroresVisibles.value.frecuenciaId)"
            :class="[claseSelect, trayecto.erroresVisibles.value.frecuenciaId ? 'border-red-400' : 'border-slate-300']"
          >
            <option value="" disabled>Seleccione una frecuencia</option>
            <option v-for="frecuencia in frecuenciasActivas" :key="frecuencia.id" :value="frecuencia.id">
              {{ frecuencia.ciudadOrigen }} → {{ frecuencia.ciudadDestino }} ({{ frecuencia.horaSalida }})
            </option>
          </select>
          <p v-if="trayecto.erroresVisibles.value.frecuenciaId" role="alert" class="text-[11px] font-semibold text-red-600">
            ⚠️ {{ trayecto.erroresVisibles.value.frecuenciaId }}
          </p>
          <p v-else-if="frecuenciasActivas.length === 0 && !loading" class="text-[11px] font-medium text-amber-600">
            No hay frecuencias activas.
          </p>
        </div>

        <div class="space-y-1.5">
          <label for="select-bus-hoja" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Unidad / Bus <span class="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="select-bus-hoja"
            v-model="trayecto.formulario.busId"
            :disabled="loading || !admiteTrayectos || busesActivos.length === 0"
            :aria-invalid="Boolean(trayecto.erroresVisibles.value.busId)"
            :class="[claseSelect, trayecto.erroresVisibles.value.busId ? 'border-red-400' : 'border-slate-300']"
          >
            <option value="" disabled>Seleccione una unidad</option>
            <option v-for="bus in busesActivos" :key="bus.id" :value="bus.id">
              Bus #{{ bus.numero }} ({{ bus.placa }})
            </option>
          </select>
          <p v-if="trayecto.erroresVisibles.value.busId" role="alert" class="text-[11px] font-semibold text-red-600">
            ⚠️ {{ trayecto.erroresVisibles.value.busId }}
          </p>
          <p v-else-if="busesActivos.length === 0 && !loading" class="text-[11px] font-medium text-amber-600">
            No hay buses activos.
          </p>
        </div>

        <div class="md:pt-7">
          <ButtonBase
            type="submit"
            form="form-asignar-trayecto"
            variant="primary"
            size="md"
            full-width
            :loading="loading"
            :disabled="!admiteTrayectos || trayecto.hayErroresVisibles.value"
          >
            Vincular al plan
          </ButtonBase>
        </div>
      </form>
    </CardBase>

    <!-- Hojas de ruta de la fecha -->
    <CardBase v-if="loading && hojasRuta.length === 0" padding="none">
      <div
        class="space-y-3 p-5 sm:p-6"
        role="status"
        aria-live="polite"
        aria-label="Cargando hojas de ruta"
      >
        <span class="sr-only">Cargando hojas de ruta...</span>
        <div v-for="fila in 3" :key="fila" class="h-16 animate-pulse rounded-xl bg-slate-100"></div>
      </div>
    </CardBase>

    <CardBase v-else-if="error && hojasRuta.length === 0" padding="none">
      <div class="px-5 py-12 text-center sm:px-6" role="alert">
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl"
          aria-hidden="true"
        >
          ⚠️
        </div>
        <h3 class="mt-4 text-base font-bold text-slate-800">No pudimos cargar las hojas de ruta</h3>
        <p class="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">{{ error }}</p>
        <div class="mt-4 flex justify-center">
          <ButtonBase :loading="loading" @click="consultarPlan">Reintentar</ButtonBase>
        </div>
      </div>
    </CardBase>

    <CardBase v-else-if="hojasRuta.length === 0" padding="none">
      <div class="px-5 py-12 text-center sm:px-6">
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl"
          aria-hidden="true"
        >
          📋
        </div>
        <h3 class="mt-4 text-base font-bold text-slate-800">Sin programación para esta fecha</h3>
        <p class="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
          No se encontró ninguna hoja de ruta para el día {{ fechaOperacion.formulario.valor }}. Vincula un
          trayecto o genera la hoja del día.
        </p>
        <div class="mt-4 flex justify-center">
          <ButtonBase @click="handleCrearHojaDia">Crear hoja del día</ButtonBase>
        </div>
      </div>
    </CardBase>

    <div v-else class="space-y-6">
      <section v-for="hoja in hojasRuta" :key="hoja.id" class="space-y-3" :aria-label="`Hoja de ruta ${hoja.id}`">
        <!-- Encabezado de la hoja -->
        <div
          class="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-sm font-bold text-blue-700"
              aria-hidden="true"
            >
              #{{ hoja.id }}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-bold text-slate-900">Hoja de ruta #{{ hoja.id }}</h3>
                <span
                  class="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  :class="claseBadgeEstadoHoja(hoja.estado)"
                >
                  {{ hoja.estado }}
                </span>
              </div>
              <p class="mt-0.5 text-xs text-slate-500">
                Fecha operativa: <strong class="font-mono text-slate-700">{{ hoja.fecha }}</strong>
                · Tipo: {{ hoja.tipoGeneracion || 'Manual' }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <ActionButton
              v-if="hoja.estado === EstadoHojaRuta.BORRADOR"
              action="success"
              label="Iniciar operación"
              :disabled="loading"
              :aria-label="`Iniciar la operación de la hoja ${hoja.id}`"
              @click="handleIniciarHoja(hoja)"
            />
            <ActionButton
              v-if="hoja.estado === EstadoHojaRuta.EMITIDA"
              action="primary"
              label="Cerrar hoja"
              :disabled="loading"
              :aria-label="`Cerrar la hoja ${hoja.id}`"
              @click="handleFinalizarHoja(hoja)"
            />
            <ActionButton
              v-if="hoja.estado !== EstadoHojaRuta.CERRADA"
              action="danger"
              label="Cancelar hoja"
              :disabled="loading"
              :aria-label="`Cancelar la hoja ${hoja.id}`"
              @click="handleCancelarHoja(hoja)"
            />
          </div>
        </div>

        <!-- Trayectos de la hoja -->
        <TripList
          :rutas="hoja.rutas || []"
          :buses="buses"
          :frecuencias="frecuencias"
          :readonly="hoja.estado === EstadoHojaRuta.CERRADA"
          @toggle-directo="onToggleDirecto"
          @iniciar-viaje="(ruta) => operarTrayecto('iniciar', ruta)"
          @finalizar-viaje="(ruta) => operarTrayecto('finalizar', ruta)"
          @cancelar-viaje="(ruta) => operarTrayecto('cancelar', ruta)"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import ActionButton from '../../Components/ActionButton.vue'
import ButtonBase from '../../Components/ButtonBase.vue'
import CardBase from '../../Components/CardBase.vue'
import CreateButton from '../../Components/CreateButton.vue'
import InputBase from '../../Components/InputBase.vue'
import MetricCard from '../../Components/MetricCard.vue'
import RefreshButton from '../../Components/RefreshButton.vue'
import TripList from '../../Components/HojaRuta/TripList.vue'
import { useCampoValidado } from '../../Composables/useCampoValidado'
import { useFeedback } from '../../Composables/useFeedback'
import { useHojaRuta } from '../../Composables/useHojaRuta'
import { useRutas } from '../../Composables/useRutas'
import { useTrayectoFormValidation } from '../../Composables/useTrayectoFormValidation'
import {
  claseBadgeEstadoHoja,
  fechaAdmiteTrayectos,
  fechaLocalISO,
  resumirHojas,
} from '../../Composables/presentacionRutas'
import { validarFechaConsulta } from '../../Composables/validacionRutas'
import { EstadoHojaRuta } from '../../../Domain/Constants/EstadosSistema'
import type { HojaRuta } from '../../../Domain/Entities/HojaRuta'
import type { Ruta } from '../../../Domain/Entities/Ruta'
import { mensajeErrorParaUsuario } from '../../Utils/errorMessage'

const { showSuccess, showError, showWarning, confirm } = useFeedback()

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
  frecuenciasActivas,
  busesActivos,
  cargarBuses,
  cargarFrecuencias,
  iniciarViaje,
  finalizarViaje,
  cancelarViaje,
} = useRutas()

// Mismo estilo que los selects de los formularios del equipo (EditarBusModal).
const claseSelect =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'

const fechaOperacion = useCampoValidado(validarFechaConsulta)
fechaOperacion.iniciar(fechaLocalISO())
const trayecto = useTrayectoFormValidation()

const resumen = computed(() => resumirHojas(hojasRuta.value))
const admiteTrayectos = computed(() => fechaAdmiteTrayectos(hojasRuta.value))
const tarjetasResumen = computed(() => [
  { etiqueta: 'Hojas del día', valor: resumen.value.hojas, detalle: 'Hojas de ruta registradas', icono: '📋', variant: 'default' as const },
  { etiqueta: 'Trayectos', valor: resumen.value.trayectos, detalle: 'Unidades programadas', icono: '🛣️', variant: 'info' as const },
  { etiqueta: 'En curso', valor: resumen.value.enCurso, detalle: 'Viajando ahora', icono: '🚌', variant: 'warning' as const },
  { etiqueta: 'Finalizados', valor: resumen.value.finalizados, detalle: 'Viajes completados', icono: '✅', variant: 'success' as const },
])

onMounted(async () => {
  await Promise.all([consultarPlan(), cargarBuses(), cargarFrecuencias()].map((tarea) => tarea.catch(() => undefined)))
})

// Al cambiar la fecha se consulta de nuevo, siempre que sea una fecha válida.
watch(
  () => fechaOperacion.formulario.valor,
  () => {
    if (fechaOperacion.esValido.value) void consultarPlan()
  },
)

async function consultarPlan() {
  if (!fechaOperacion.validarTodo()) return
  try {
    await cargarPorFecha(fechaOperacion.formulario.valor)
  } catch {
    // El mensaje queda en `error` y se muestra en el estado de error de la lista.
  }
}

async function handleCrearHojaDia() {
  if (!fechaOperacion.validarTodo()) return
  try {
    await crearHojaDia(fechaOperacion.formulario.valor)
    showSuccess(`Se generó la hoja de ruta de la fecha ${fechaOperacion.formulario.valor}.`)
  } catch (err: unknown) {
    showError(mensajeErrorParaUsuario(err, 'No se pudo crear la hoja de ruta.'))
  }
}

async function handleAsignarTrayecto() {
  if (!admiteTrayectos.value) return
  if (!trayecto.validarTodo() || !fechaOperacion.validarTodo()) return

  const { busId, frecuenciaId } = trayecto.aDatos()
  const ok = await agregarTrayecto(busId, frecuenciaId, fechaOperacion.formulario.valor)

  if (ok) {
    showSuccess('El bus fue vinculado a la frecuencia en la hoja operativa.')
    trayecto.limpiar()
  } else {
    showError(error.value || 'No se pudo asignar el trayecto a la hoja.')
  }
}

async function handleIniciarHoja(hoja: HojaRuta) {
  if (!hoja.id) return
  const confirmado = await confirm({
    title: 'Iniciar operación',
    message: `¿Confirmas el inicio de operación de la hoja de ruta #${hoja.id}?`,
    type: 'info',
  })
  if (!confirmado) return

  try {
    await iniciarHoja(hoja.id, fechaOperacion.formulario.valor)
    showSuccess('La hoja de ruta fue emitida y está activa.')
  } catch (err: unknown) {
    showError(mensajeErrorParaUsuario(err, 'No se pudo iniciar la hoja de ruta.'))
  }
}

async function handleFinalizarHoja(hoja: HojaRuta) {
  if (!hoja.id) return
  const confirmado = await confirm({
    title: 'Cerrar hoja de ruta',
    message: `¿Confirmas el cierre de la hoja #${hoja.id}? Esta acción completará todos los trayectos pendientes.`,
    type: 'warning',
    confirmText: 'Cerrar hoja',
  })
  if (!confirmado) return

  try {
    await finalizarHoja(hoja.id, fechaOperacion.formulario.valor)
    showSuccess('La hoja de ruta fue cerrada correctamente.')
  } catch (err: unknown) {
    showError(mensajeErrorParaUsuario(err, 'No se pudo cerrar la hoja de ruta.'))
  }
}

async function handleCancelarHoja(hoja: HojaRuta) {
  if (!hoja.id) return
  const confirmado = await confirm({
    title: 'Cancelar hoja de ruta',
    message: `¿Estás seguro de cancelar la hoja #${hoja.id} y todos sus viajes asociados?`,
    type: 'warning',
    confirmText: 'Cancelar hoja',
  })
  if (!confirmado) return

  try {
    await cancelarHoja(hoja.id, 'Cancelada por el supervisor', fechaOperacion.formulario.valor)
    showWarning('La hoja de ruta fue cancelada.')
  } catch (err: unknown) {
    showError(mensajeErrorParaUsuario(err, 'No se pudo cancelar la hoja de ruta.'))
  }
}

async function onToggleDirecto(ruta: Ruta) {
  const ok = await toggleTipoRuta(ruta, fechaOperacion.formulario.valor)
  if (ok) showSuccess('La modalidad del trayecto fue actualizada.')
  else showError(error.value || 'No se pudo cambiar la modalidad del trayecto.')
}

type AccionTrayecto = 'iniciar' | 'finalizar' | 'cancelar'

const ACCIONES_TRAYECTO: Record<
  AccionTrayecto,
  {
    titulo: string
    mensaje: string
    tipo: 'info' | 'warning'
    ejecutar: (id: number) => Promise<unknown>
    exito: string
    falla: string
  }
> = {
  iniciar: {
    titulo: 'Iniciar viaje',
    mensaje: '¿Confirmas el inicio de este trayecto? La unidad pasará a En curso.',
    tipo: 'info',
    ejecutar: (id) => iniciarViaje(id),
    exito: 'El trayecto quedó En curso.',
    falla: 'No se pudo iniciar el trayecto.',
  },
  finalizar: {
    titulo: 'Finalizar viaje',
    mensaje: '¿Confirmas que este trayecto concluyó satisfactoriamente?',
    tipo: 'info',
    ejecutar: (id) => finalizarViaje(id),
    exito: 'El trayecto fue finalizado.',
    falla: 'No se pudo finalizar el trayecto.',
  },
  cancelar: {
    titulo: 'Cancelar viaje',
    mensaje: '¿Estás seguro de cancelar este trayecto? Esta acción no se puede deshacer.',
    tipo: 'warning',
    ejecutar: (id) => cancelarViaje(id, 'Cancelado desde la hoja de ruta'),
    exito: 'El trayecto fue cancelado.',
    falla: 'No se pudo cancelar el trayecto.',
  },
}

async function operarTrayecto(accion: AccionTrayecto, ruta: Ruta) {
  if (!ruta.id) return
  const config = ACCIONES_TRAYECTO[accion]
  const confirmado = await confirm({ title: config.titulo, message: config.mensaje, type: config.tipo })
  if (!confirmado) return

  try {
    await config.ejecutar(ruta.id)
    await consultarPlan()
    if (accion === 'cancelar') showWarning(config.exito)
    else showSuccess(config.exito)
  } catch (err: unknown) {
    showError(mensajeErrorParaUsuario(err, config.falla))
  }
}
</script>
