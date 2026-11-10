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
          Prueba con otro origen, destino o fecha. Solo se muestran rutas programadas o en curso.
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
          <table class="w-full text-left text-sm border-collapse" aria-label="Rutas disponibles para compra">
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
                    {{ ruta.bus && ruta.totalAsientos ? 'Seleccionar' : 'No disponible' }}
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
          <CardBase title="Mapa de asientos" subtitle="Los asientos ocupados ya tienen un boleto emitido o pendiente">
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
          <CardBase title="Resumen y pago" class="xl:sticky xl:top-24">
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
                  <span class="font-bold text-slate-900">Total</span>
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
                    <span aria-hidden="true">{{ metodo === 'Transferencia' ? '🏦' : '💳' }}</span>
                    {{ metodo }}
                  </button>
                </div>
              </div>

              <div v-if="metodoPago === 'Transferencia'" class="space-y-3">
                <label class="block rounded-xl border border-slate-300 bg-white p-3">
                  <span class="block text-xs font-bold text-slate-700">Comprobante de transferencia</span>
                  <span class="mt-1 block text-[11px] text-slate-500">
                    PNG, JPG, WEBP o PDF de hasta 5 MB. Los boletos quedarán en
                    «Proceso de validacion» hasta que un oficinista apruebe el pago.
                  </span>
                  <input
                    ref="archivoInput"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    class="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-blue-700"
                    @change="onArchivoChange"
                  />
                </label>

                <div
                  v-if="comprobante"
                  class="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                >
                  <span class="truncate">{{ comprobante.name }}</span>
                  <button type="button" class="font-bold text-emerald-800 hover:underline" @click="limpiarComprobante">
                    Quitar
                  </button>
                </div>
              </div>

              <StripePaymentForm
                v-else
                ref="stripeForm"
                :amount="totalConDescuentos"
                :disabled="enviando"
                :show-submit-button="false"
                @error="errorStripe = $event"
              />

              <ButtonBase
                full-width
                size="lg"
                :loading="enviando"
                :disabled="!puedeConfirmar"
                @click="confirmar"
              >
                <span v-if="metodoPago === 'Tarjeta'" aria-hidden="true">💳</span>
                <span v-else aria-hidden="true">🎟️</span>
                {{ metodoPago === 'Tarjeta' ? `Pagar $${formatearPrecio(totalConDescuentos)}` : 'Registrar compra' }}
              </ButtonBase>

              <p class="text-[11px] leading-relaxed text-slate-400">
                La disponibilidad de los asientos se verifica nuevamente al confirmar la compra.
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
import StripePaymentForm from '../../Components/StripePaymentForm.vue'
import ComprobanteBoletoModal from '../../Components/ComprobanteBoletoModal.vue'
import { useAuthStore } from '../../Store/authStore'
import { useRutas } from '../../Composables/useRutas'
import { useSeleccionCompra } from '../../Composables/useSeleccionCompra'
import { useCompraOnline } from '../../Composables/useCompraOnline'
import { useFeedback } from '../../Composables/useFeedback'
import {
  construirRutasDisponibles,
  formatearFechaRuta,
  formatearHora,
  type RutaDisponible,
} from '../../Utils/rutasDisponibles'
import {
  MENSAJE_SUPABASE_NO_CONFIGURADO,
  obtenerMensajeError,
  supabaseConfigurado,
} from '../../Utils/configuracion'
import type { Boleto } from '../../../Domain/Entities/Boleto'

type MetodoPagoOnline = 'Transferencia' | 'Tarjeta'

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
const {
  asientosMapa,
  asientosOcupados,
  asientosSeleccionados,
  preciosPorTipo,
  tarifaBase,
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
  pasajerosParaConfirmar,
} = useSeleccionCompra()
const { comprar: procesarCompraOnline, loading: enviando } = useCompraOnline()

const hoy = new Date().toISOString().slice(0, 10)
const filtroOrigen = ref('')
const filtroDestino = ref('')
const filtroFecha = ref('')
const cargando = ref(false)
const rutaSeleccionada = ref<RutaDisponible | null>(null)
const metodoPago = ref<MetodoPagoOnline>('Transferencia')
const comprobante = ref<File | null>(null)
const archivoInput = ref<HTMLInputElement | null>(null)
const stripeForm = ref<{ pagar: (monto?: number) => Promise<string>; reiniciar: () => void } | null>(null)
const errorStripe = ref<string | null>(null)
const mostrarComprobante = ref(false)
const comprobanteBoletos = ref<Boleto[]>([])
const comprobanteContexto = ref<ContextoComprobanteVista | null>(null)

const paginaActual = ref(1)
const registrosPorPagina = ref(10)

const metodosPago: MetodoPagoOnline[] = ['Transferencia', 'Tarjeta']

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
    pasajerosValidos.value &&
    !enviando.value &&
    (metodoPago.value !== 'Transferencia' || Boolean(comprobante.value)),
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

  return Array.from(ciudades).some((ciudad) =>
    ciudad.toLowerCase().includes(texto),
  )
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
      obtenerMensajeError(error, 'No se pudieron cargar las rutas disponibles.'),
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
  errorStripe.value = null
  comprobante.value = null
  metodoPago.value = 'Transferencia'
  rutaSeleccionada.value = item

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
  comprobante.value = null
  errorStripe.value = null
  limpiarSeleccion()
}

function onArchivoChange(event: Event): void {
  const input = event.target as HTMLInputElement
  comprobante.value = input.files?.[0] ?? null
}

function limpiarComprobante(): void {
  comprobante.value = null
  if (archivoInput.value) archivoInput.value.value = ''
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
    /* El error ya se reporta al cargar el mapa; evitamos duplicarlo tras la compra. */
  }
}

async function confirmar(): Promise<void> {
  errorStripe.value = null

  const actual = rutaSeleccionada.value
  if (!actual?.ruta.id) {
    showError('Selecciona una ruta antes de confirmar la compra.')
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
  if (metodoPago.value === 'Transferencia' && !comprobante.value) {
    showError('Adjunta el comprobante para registrar el pago por transferencia.')
    return
  }
  if (metodoPago.value === 'Tarjeta' && !stripeForm.value) {
    showError('El formulario de pago con tarjeta todavía no está disponible.')
    return
  }

  try {
    const resultado = await procesarCompraOnline(
      {
        ruta: {
          id: actual.ruta.id,
          origen: actual.origen,
          destino: actual.destino,
        },
        asientos: [...asientosSeleccionados.value],
        precioUnitario: tarifaBase.value,
        pasajeros: pasajerosParaConfirmar(),
        metodoPago: metodoPago.value,
        capturaArchivo: metodoPago.value === 'Transferencia' ? comprobante.value : null,
        canal: 'online',
        usuarioId: authStore.user?.id ?? null,
      },
      async (monto) => {
        if (!stripeForm.value) {
          throw new Error('El formulario de pago con tarjeta todavía no está disponible.')
        }
        return stripeForm.value.pagar(monto)
      },
    )

    const esTransferencia = metodoPago.value === 'Transferencia'
    comprobanteBoletos.value = resultado.boletos ?? []
    comprobanteContexto.value = {
      origen: actual.origen,
      destino: actual.destino,
      fecha: actual.fecha,
      horaSalida: actual.horaSalida,
      metodoPago: metodoPago.value,
      estado: esTransferencia ? 'Proceso de validacion' : 'Emitido',
      total: Number(resultado.total ?? 0),
      ventaId: resultado.ventaId,
      mensaje: esTransferencia
        ? 'Tu compra quedó registrada. Un oficinista validará el comprobante antes de emitir los boletos.'
        : 'Pago confirmado por Stripe. Tus boletos ya están emitidos.',
    }
    mostrarComprobante.value = true
    comprobante.value = null
    if (archivoInput.value) archivoInput.value.value = ''
    stripeForm.value?.reiniciar()
    await recargarMapa()
  } catch (error) {
    showError(
      obtenerMensajeError(error, 'No se pudo completar la compra de los boletos.'),
    )
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
