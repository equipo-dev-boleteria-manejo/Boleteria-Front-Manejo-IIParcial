<template>
  <div class="space-y-4 max-w-7xl mx-auto font-sans">
    <!-- Tarjetas de Métricas / KPIs -->
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de rutas disponibles">
      <MetricCard
        title="Rutas disponibles"
        :value="cargando && !rutasFiltradas.length ? '—' : resumenRutas.total"
        icon="🛣️"
        description="Para los filtros aplicados"
        variant="default"
      />
      <MetricCard
        title="Buses asignados"
        :value="cargando && !rutasFiltradas.length ? '—' : resumenRutas.conBus"
        icon="🚌"
        description="Unidades operativas"
        variant="info"
      />
      <MetricCard
        title="Asientos totales"
        :value="cargando && !rutasFiltradas.length ? '—' : resumenRutas.asientos"
        icon="💺"
        description="Capacidad ofertada"
        variant="success"
      />
      <MetricCard
        title="Rutas directas"
        :value="cargando && !rutasFiltradas.length ? '—' : resumenRutas.directas"
        icon="⚡"
        description="Sin paradas intermedias"
        variant="warning"
      />
    </section>

    <!-- Barra de Búsqueda y Filtros Unificada -->
    <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
        <SelectFilter
          label="Origen:"
          v-model="filtroOrigen"
          :options="ciudadesOpciones"
        />
        <SelectFilter
          label="Destino:"
          v-model="filtroDestino"
          :options="ciudadesOpciones"
        />
        <div class="w-36">
          <InputBase v-model="filtroFecha" type="date" :min="hoy" placeholder="Fecha" />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
        <SelectFilter
          label="Mostrar:"
          v-model="registrosPorPagina"
          :options="[
            { value: 5, label: '5 filas' },
            { value: 10, label: '10 filas' },
            { value: 20, label: '20 filas' },
          ]"
        />

        <ButtonBase type="submit" :loading="cargando" :disabled="cargando" @click="buscar">
          <span aria-hidden="true">🔎</span>
          Buscar
        </ButtonBase>
        <ButtonBase
          v-if="hayFiltros"
          variant="outline"
          :disabled="cargando"
          @click="limpiarFiltros"
        >
          Limpiar
        </ButtonBase>
      </div>
    </div>

    <template v-if="!rutaSeleccionada">
      <!-- Estado 1: CARGANDO -->
      <div
        v-if="cargando"
        class="rounded-2xl bg-white border border-slate-200 p-12 text-center shadow-sm space-y-4"
        aria-busy="true"
      >
        <div class="animate-spin h-8 w-8 text-blue-600 mx-auto">
          <svg class="w-full h-full" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Buscando rutas disponibles…</p>
      </div>

      <!-- Estado 2: VACÍO -->
      <div
        v-else-if="!rutasFiltradas.length"
        class="rounded-2xl bg-white border border-slate-200 p-16 text-center shadow-sm space-y-3"
      >
        <div class="text-4xl text-slate-300">🗺️</div>
        <h3 class="text-base font-black text-slate-800">No hay rutas para esos filtros</h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">
          Solo se muestran rutas programadas o en curso. Prueba con otra fecha u origen.
        </p>
        <div class="pt-2">
          <ButtonBase variant="outline" size="sm" @click="limpiarFiltros">
            Restablecer Filtros
          </ButtonBase>
        </div>
      </div>

      <!-- Estado 3: TABLA DE RUTAS -->
      <div v-else class="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse" aria-label="Rutas disponibles para venta">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-600 tracking-wider">
              <tr>
                <th scope="col" class="px-6 py-3.5">Ruta</th>
                <th scope="col" class="px-6 py-3.5">Origen → Destino</th>
                <th scope="col" class="px-6 py-3.5">Salida</th>
                <th scope="col" class="px-6 py-3.5">Bus</th>
                <th scope="col" class="px-6 py-3.5 text-center">Asientos</th>
                <th scope="col" class="px-6 py-3.5 text-center">Estado</th>
                <th scope="col" class="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
              <tr
                v-for="ruta in rutasPaginadas"
                :key="ruta.ruta.id"
                class="hover:bg-blue-50/50 transition-colors"
              >
                <td class="px-6 py-3">
                  <div class="font-bold text-slate-900 text-sm leading-tight">
                    {{ ruta.frecuencia?.identificadorFrecuencia || `Ruta #${ruta.ruta.id}` }}
                  </div>
                  <div class="text-slate-400 text-xs">Ruta #{{ ruta.ruta.id }}</div>
                </td>
                <td class="px-6 py-3">
                  <div class="font-bold text-slate-900">{{ ruta.origen }} → {{ ruta.destino }}</div>
                  <div class="text-slate-400 text-xs">{{ ruta.esDirecta ? 'Directo' : 'Con paradas' }}</div>
                </td>
                <td class="px-6 py-3 text-slate-500">
                  <div>{{ formatearFechaRuta(ruta.fecha) }}</div>
                  <div class="text-slate-400">{{ formatearHora(ruta.horaSalida) }}</div>
                </td>
                <td class="px-6 py-3">
                  <div class="font-bold text-slate-900">{{ ruta.bus?.numero || 'No asignado' }}</div>
                  <div v-if="ruta.bus?.placa" class="text-slate-400 text-xs">{{ ruta.bus.placa }}</div>
                  <span class="inline-block mt-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                    {{ (ruta.bus?.pisos && ruta.bus.pisos > 1) || (ruta.totalAsientos && ruta.totalAsientos > 30) ? '2 Pisos (VIP/Estándar)' : '1 Piso' }}
                  </span>
                </td>
                <td class="px-6 py-3 text-center">
                  <span class="inline-flex items-center justify-center rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 text-[11px] font-bold">
                    {{ ruta.totalAsientos || 'Sin configurar' }}
                  </span>
                </td>
                <td class="px-6 py-3 text-center">
                  <span
                    class="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-2xs"
                    :class="claseEstadoRuta(ruta.estado)"
                  >
                    {{ ruta.estado }}
                  </span>
                </td>
                <td class="px-6 py-3 text-right">
                  <ButtonBase
                    size="sm"
                    :disabled="!ruta.bus || !ruta.totalAsientos"
                    @click="seleccionarRuta(ruta)"
                  >
                    <span aria-hidden="true">🎟️</span>
                    {{ ruta.bus && ruta.totalAsientos ? 'Vender' : 'No disponible' }}
                  </ButtonBase>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <PaginationControls
          :current-page="paginaActual"
          :total-pages="totalPaginas"
          :total-items="rutasFiltradas.length"
          :items-per-page="registrosPorPagina"
          :has-prev-page="paginaActual > 1"
          :has-next-page="paginaActual < totalPaginas"
          @prev="paginaActual--"
          @next="paginaActual++"
          @set-page="(p) => (paginaActual = p)"
        />
      </div>
    </template>

    <template v-else>
      <CardBase padding="sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-start gap-3">
            <ButtonBase variant="outline" size="sm" @click="volverAlListado">
              <span aria-hidden="true">←</span>
              Volver
            </ButtonBase>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {{ rutaSeleccionada.frecuencia?.identificadorFrecuencia || `Ruta #${rutaSeleccionada.ruta.id}` }}
              </p>
              <h2 class="text-lg font-black leading-tight text-slate-900">
                {{ rutaSeleccionada.origen }} → {{ rutaSeleccionada.destino }}
              </h2>
              <p class="text-xs font-semibold text-slate-500">
                {{ formatearFechaRuta(rutaSeleccionada.fecha) }} ·
                {{ formatearHora(rutaSeleccionada.horaSalida) }} ·
                Bus {{ rutaSeleccionada.bus?.numero || 'No asignado' }}
                <span class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 ml-1.5 border border-blue-200">
                  🚌 {{ (rutaSeleccionada.bus?.pisos && rutaSeleccionada.bus.pisos > 1) || (rutaSeleccionada.totalAsientos && rutaSeleccionada.totalAsientos > 30) ? 'Bus de 2 Pisos (VIP y Estándar)' : 'Bus de 1 Piso' }}
                </span>
              </p>
            </div>
          </div>

          <span
            class="rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider"
            :class="claseEstadoRuta(rutaSeleccionada.estado)"
          >
            {{ rutaSeleccionada.estado }}
          </span>
        </div>
      </CardBase>

      <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
        <div class="space-y-6">
          <CardBase
            title="Mapa de asientos"
            subtitle="Los asientos ocupados ya tienen un boleto emitido o pendiente"
          >
            <div
              v-if="errorMapa"
              class="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
            >
              <span aria-hidden="true">⚠️</span>
              <span>{{ errorMapa }}</span>
            </div>

            <SelectorAsientos
              :asientos="asientosMapa"
              :ocupados="asientosOcupados"
              :seleccionados="asientosSeleccionados"
              :precios-por-tipo="preciosPorTipo"
              :loading="cargandoMapa"
              @toggle="alternarAsiento"
            />
          </CardBase>

          <CardBase
            v-if="cantidadSeleccionada"
            title="Datos de los pasajeros"
            subtitle="Un pasajero distinto por cada asiento seleccionado"
          >
            <div
              v-if="hayCedulasDuplicadas"
              class="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-800"
            >
              <span aria-hidden="true">⚠️</span>
              <span>
                La cédula {{ cedulasDuplicadas.join(', ') }} está repetida. Cada asiento debe tener un pasajero diferente.
              </span>
            </div>

            <FormularioPasajeros
              :pasajeros="pasajerosCalculados"
              @actualizar="actualizarDatos"
            />
          </CardBase>
        </div>

        <div class="space-y-6">
          <CardBase title="Resumen y cobro" class="xl:sticky xl:top-24">
            <div class="space-y-4">
              <div class="rounded-xl bg-slate-50 p-3.5 text-xs">
                <div class="flex items-center justify-between gap-3">
                  <span class="font-semibold text-slate-500">Asientos seleccionados</span>
                  <span class="font-black text-slate-900">{{ cantidadSeleccionada }}</span>
                </div>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  <span
                    v-for="pasajero in pasajerosCalculados"
                    :key="pasajero.asientoId"
                    class="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200"
                  >
                    #{{ pasajero.asientoNumero }}
                    <span class="font-normal text-slate-400">{{ pasajero.tipoPasajero }}</span>
                  </span>
                  <span v-if="!cantidadSeleccionada" class="text-[11px] text-slate-400">
                    Selecciona uno o más asientos en el mapa.
                  </span>
                </div>
              </div>

              <div class="space-y-2 text-sm">
                <div class="flex items-center justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span class="font-semibold text-slate-700">${{ formatearPrecio(totalBase) }}</span>
                </div>
                <div v-if="ahorro > 0" class="flex items-center justify-between text-emerald-700">
                  <span>Descuentos</span>
                  <span class="font-semibold">-${{ formatearPrecio(ahorro) }}</span>
                </div>
                <div class="flex items-center justify-between border-t border-slate-200 pt-2">
                  <span class="font-bold text-slate-900">Total a cobrar</span>
                  <span class="text-lg font-black text-slate-900">${{ formatearPrecio(totalConDescuentos) }}</span>
                </div>
              </div>

              <div>
                <p class="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Método de pago
                </p>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="metodo in metodosPago"
                    :key="metodo"
                    type="button"
                    class="rounded-xl border px-3 py-2.5 text-xs font-bold transition"
                    :class="
                      metodoPago === metodo
                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    "
                    @click="metodoPago = metodo"
                  >
                    <span aria-hidden="true">{{ metodo === 'Efectivo' ? '💵' : '🏦' }}</span>
                    {{ metodo }}
                  </button>
                </div>
              </div>

              <p
                v-if="metodoPago === 'Transferencia'"
                class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800"
              >
                La venta en ventanilla registra el pago como aprobado. Si el cliente
                transfiere desde su banco, verifica el abono antes de emitir los boletos.
              </p>

              <ButtonBase
                full-width
                size="lg"
                :loading="enviando"
                :disabled="!puedeConfirmar"
                @click="confirmar"
              >
                <span aria-hidden="true">🎟️</span>
                Registrar venta por ${{ formatearPrecio(totalConDescuentos) }}
              </ButtonBase>

              <p class="text-[11px] leading-relaxed text-slate-400">
                La disponibilidad de los asientos se verifica nuevamente al registrar la venta.
              </p>
            </div>
          </CardBase>
        </div>
      </div>
    </template>

    <ComprobanteBoletoModal
      v-model="mostrarComprobante"
      :boletos="comprobanteBoletos"
      :contexto="comprobanteContexto"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import CardBase from '../../Components/CardBase.vue'
import InputBase from '../../Components/InputBase.vue'
import ButtonBase from '../../Components/ButtonBase.vue'
import MetricCard from '../../Components/MetricCard.vue'
import PaginationControls from '../../Components/PaginationControls.vue'
import SelectFilter from '../../Components/SelectFilter.vue'
import SelectorAsientos from '../../Components/SelectorAsientos.vue'
import FormularioPasajeros from '../../Components/FormularioPasajeros.vue'
import ComprobanteBoletoModal from '../../Components/ComprobanteBoletoModal.vue'
import { useAuthStore } from '../../Store/authStore'
import { useRutas } from '../../Composables/useRutas'
import { useControlBoletos } from '../../Composables/useControlBoletos'
import { useSeleccionCompra } from '../../Composables/useSeleccionCompra'
import { useFeedback } from '../../Composables/useFeedback'
import {
  construirRutasDisponibles,
  formatearFechaRuta,
  formatearHora,
  type RutaDisponible,
} from '../../Utils/rutasDisponibles'
import {
  MENSAJE_SESION_REQUERIDA,
  MENSAJE_SUPABASE_NO_CONFIGURADO,
  obtenerMensajeError,
  supabaseConfigurado,
} from '../../Utils/configuracion'
import type { Boleto } from '../../../Domain/Entities/Boleto'

type MetodoPagoVentanilla = 'Efectivo' | 'Transferencia'

interface ContextoComprobanteVista {
  origen: string
  destino: string
  fecha: string
  horaSalida: string
  metodoPago: string
  estado: string
  total: number
  ventaId?: number
  mensaje: string
}

const authStore = useAuthStore()
const { showError, showSuccess } = useFeedback()
const {
  rutas,
  buses,
  frecuencias,
  cargarRutas,
  cargarBuses,
  cargarFrecuencias,
} = useRutas()
const { venderEnVentanilla, loading: cargandoVenta } = useControlBoletos()
const {
  asientosMapa,
  asientosOcupados,
  asientosSeleccionados,
  preciosPorTipo,
  loading: cargandoMapa,
  error: errorMapa,
  cantidadSeleccionada,
  totalBase,
  totalConDescuentos,
  ahorro,
  pasajerosCalculados,
  pasajerosValidos,
  cedulasDuplicadas,
  hayCedulasDuplicadas,
  cargarMapa,
  alternarAsiento,
  actualizarDatos,
  limpiarSeleccion,
  pasajerosParaVentanilla,
} = useSeleccionCompra()

const hoy = new Date().toISOString().slice(0, 10)
const filtroOrigen = ref('')
const filtroDestino = ref('')
const filtroFecha = ref('')
const cargando = ref(false)
const rutaSeleccionada = ref<RutaDisponible | null>(null)
const metodoPago = ref<MetodoPagoVentanilla>('Efectivo')
const enviando = ref(false)
const mostrarComprobante = ref(false)
const comprobanteBoletos = ref<Boleto[]>([])
const comprobanteContexto = ref<ContextoComprobanteVista | null>(null)

const paginaActual = ref(1)
const registrosPorPagina = ref(10)

const metodosPago: MetodoPagoVentanilla[] = ['Efectivo', 'Transferencia']

const rutasDisponibles = computed(() =>
  construirRutasDisponibles(rutas.value, frecuencias.value, buses.value),
)

const ciudadesDisponibles = computed(() => {
  const ciudades = new Set<string>()
  frecuencias.value.forEach((frecuencia) => {
    ciudades.add(frecuencia.ciudadOrigen)
    ciudades.add(frecuencia.ciudadDestino)
    frecuencia.paradas.forEach((parada) => ciudades.add(parada.ciudad))
  })
  return Array.from(ciudades).sort((a, b) => a.localeCompare(b))
})

const ciudadesOpciones = computed(() => [
  { value: '', label: 'Todos' },
  ...ciudadesDisponibles.value.map((ciudad) => ({ value: ciudad, label: ciudad })),
])

const rutasFiltradas = computed(() =>
  rutasDisponibles.value.filter((item) => {
    if (filtroFecha.value) {
      if (item.fecha !== filtroFecha.value) return false
    } else if (item.fecha < hoy) {
      return false
    }

    if (filtroOrigen.value.trim() && !coincideCiudad(item, filtroOrigen.value, 'origen')) {
      return false
    }
    if (filtroDestino.value.trim() && !coincideCiudad(item, filtroDestino.value, 'destino')) {
      return false
    }

    return true
  }),
)

const resumenRutas = computed(() => {
  const lista = rutasFiltradas.value
  return {
    total: lista.length,
    conBus: lista.filter((ruta) => ruta.bus).length,
    asientos: lista.reduce((acc, ruta) => acc + (ruta.totalAsientos || 0), 0),
    directas: lista.filter((ruta) => ruta.esDirecta).length,
  }
})

const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(rutasFiltradas.value.length / registrosPorPagina.value)),
)

const rutasPaginadas = computed(() => {
  const inicio = (paginaActual.value - 1) * registrosPorPagina.value
  return rutasFiltradas.value.slice(inicio, inicio + registrosPorPagina.value)
})

const hayFiltros = computed(
  () => Boolean(filtroOrigen.value.trim() || filtroDestino.value.trim() || filtroFecha.value),
)

const puedeConfirmar = computed(
  () =>
    Boolean(rutaSeleccionada.value) &&
    Boolean(authStore.user?.id) &&
    pasajerosValidos.value &&
    !enviando.value &&
    !cargandoVenta.value,
)

watch([filtroOrigen, filtroDestino, filtroFecha, registrosPorPagina], () => {
  paginaActual.value = 1
})

function coincideCiudad(
  item: RutaDisponible,
  filtro: string,
  tipo: 'origen' | 'destino',
): boolean {
  const texto = filtro.trim().toLowerCase()
  if (!texto) return true

  const ciudades = new Set<string>([
    tipo === 'origen' ? item.origen : item.destino,
    ...(item.frecuencia?.paradas.map((parada) => parada.ciudad) ?? []),
  ])

  return Array.from(ciudades).some((ciudad) => ciudad.toLowerCase().includes(texto))
}

async function cargarDatos(): Promise<void> {
  if (!supabaseConfigurado) {
    showError(MENSAJE_SUPABASE_NO_CONFIGURADO)
    return
  }

  cargando.value = true

  try {
    await Promise.all([cargarRutas(), cargarFrecuencias(), cargarBuses()])
  } catch (error) {
    showError(
      obtenerMensajeError(
        error,
        'No se pudieron cargar las rutas disponibles para la venta.',
      ),
    )
  } finally {
    cargando.value = false
  }
}

function buscar(): void {
  void cargarDatos()
}

function limpiarFiltros(): void {
  filtroOrigen.value = ''
  filtroDestino.value = ''
  filtroFecha.value = ''
  paginaActual.value = 1
}

async function seleccionarRuta(item: RutaDisponible): Promise<void> {
  rutaSeleccionada.value = item
  metodoPago.value = 'Efectivo'

  if (!item.ruta.id) {
    showError('La ruta seleccionada no tiene un identificador válido.')
    return
  }
  if (!item.bus) {
    showError('No se encontró el bus asignado a esta ruta.')
    return
  }

  try {
    await cargarMapa({
      rutaId: item.ruta.id,
      busId: item.ruta.busId,
      totalAsientos: item.totalAsientos,
      estructura: item.estructura,
    })
  } catch (error) {
    showError(
      obtenerMensajeError(error, 'No se pudo cargar el mapa de asientos de la ruta.'),
    )
  }
}

function volverAlListado(): void {
  rutaSeleccionada.value = null
  limpiarSeleccion()
}

async function recargarMapa(): Promise<void> {
  const actual = rutaSeleccionada.value
  if (!actual?.ruta.id || !actual.bus) return

  try {
    await cargarMapa({
      rutaId: actual.ruta.id,
      busId: actual.ruta.busId,
      totalAsientos: actual.totalAsientos,
      estructura: actual.estructura,
    })
  } catch {
    /* El error ya se reporta al cargar el mapa. */
  }
}

async function confirmar(): Promise<void> {
  const actual = rutaSeleccionada.value
  if (!actual?.ruta.id) {
    showError('Selecciona una ruta antes de registrar la venta.')
    return
  }
  if (!authStore.user?.id) {
    showError(MENSAJE_SESION_REQUERIDA)
    return
  }
  if (!pasajerosValidos.value) {
    showError(
      hayCedulasDuplicadas.value
        ? 'No se puede repetir la cédula entre asientos. Corrige los datos de los pasajeros.'
        : 'Completa correctamente los datos de todos los pasajeros.',
    )
    return
  }

  enviando.value = true

  try {
    const resultado = await venderEnVentanilla({
      usuarioVendedorId: authStore.user.id,
      ruta: {
        id: actual.ruta.id,
        estado: actual.estado,
        origen: actual.origen,
        destinoFinal: actual.destino,
        esDirecto: actual.esDirecta,
      },
      ciudadDestinoVenta: actual.destino,
      paradaDestinoId: null,
      metodoPago: metodoPago.value,
      pasajeros: pasajerosParaVentanilla(),
    })

    comprobanteBoletos.value = (resultado.boletos ?? []) as Boleto[]
    comprobanteContexto.value = {
      origen: actual.origen,
      destino: actual.destino,
      fecha: actual.fecha,
      horaSalida: actual.horaSalida,
      metodoPago: metodoPago.value,
      estado: 'Emitido',
      total: Number(resultado.total ?? 0),
      ventaId: resultado.ventaId,
      mensaje:
        'Venta registrada en ventanilla. Entrega los boletos al pasajero y conserva el comprobante.',
    }
    mostrarComprobante.value = true
    showSuccess('Venta en ventanilla registrada correctamente.')
    await recargarMapa()
  } catch (error) {
    showError(
      obtenerMensajeError(error, 'No se pudo registrar la venta en ventanilla.'),
    )
  } finally {
    enviando.value = false
  }
}

function claseEstadoRuta(estado: string): string {
  const normalizado = String(estado ?? '').toLowerCase()
  if (normalizado.includes('cancel')) return 'bg-red-50 text-red-700'
  if (normalizado.includes('curso')) return 'bg-blue-50 text-blue-700'
  if (normalizado.includes('final')) return 'bg-slate-100 text-slate-500'
  return 'bg-emerald-50 text-emerald-700'
}

function formatearPrecio(valor: number): string {
  return Number(valor ?? 0).toFixed(2)
}

onMounted(() => {
  void cargarDatos()
})
</script>
