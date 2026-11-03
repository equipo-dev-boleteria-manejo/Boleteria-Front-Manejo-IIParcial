<template>
  <div class="space-y-6">
    <CardBase
      title="Venta Presencial en Taquilla"
      subtitle="Emisión directa de pasajes para oficinistas"
    >
      <form class="grid grid-cols-1 gap-4 md:grid-cols-4" @submit.prevent="buscar">
        <InputBase
          v-model="filtroOrigen"
          label="Origen"
          placeholder="Ej. Quito"
          list="ciudades-ventanilla"
          autocomplete="off"
        />
        <InputBase
          v-model="filtroDestino"
          label="Destino"
          placeholder="Ej. Guayaquil"
          list="ciudades-ventanilla"
          autocomplete="off"
        />
        <InputBase v-model="filtroFecha" label="Fecha de viaje" type="date" :min="hoy" />

        <div class="flex items-end gap-2">
          <ButtonBase type="submit" full-width :loading="cargando" :disabled="cargando">
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
      </form>

      <datalist id="ciudades-ventanilla">
        <option v-for="ciudad in ciudadesDisponibles" :key="ciudad" :value="ciudad" />
      </datalist>
    </CardBase>

    <div
      v-if="errorCarga"
      class="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
    >
      <span aria-hidden="true">⚠️</span>
      <span>{{ errorCarga }}</span>
    </div>

    <template v-if="!rutaSeleccionada">
      <div
        v-if="cargando"
        class="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-sm text-slate-500"
      >
        <span class="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        Buscando rutas disponibles…
      </div>

      <div
        v-else-if="!rutasFiltradas.length"
        class="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center"
      >
        <span class="block text-4xl" aria-hidden="true">🗺️</span>
        <h3 class="mt-2 text-sm font-bold text-slate-700">No hay rutas para esos filtros</h3>
        <p class="mt-1 text-xs text-slate-500">
          Solo se muestran rutas programadas o en curso. Prueba con otra fecha u origen.
        </p>
      </div>

      <div v-else class="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <CardBase
          v-for="ruta in rutasFiltradas"
          :key="ruta.ruta.id"
          hover
          padding="sm"
          class="flex flex-col"
        >
          <div class="flex flex-1 flex-col gap-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {{ ruta.frecuencia?.identificadorFrecuencia || `Ruta #${ruta.ruta.id}` }}
                </p>
                <h3 class="mt-0.5 text-base font-black leading-tight text-slate-900">
                  {{ ruta.origen }} → {{ ruta.destino }}
                </h3>
                <p class="mt-1 text-xs font-semibold text-slate-500">
                  {{ formatearFechaRuta(ruta.fecha) }} · {{ formatearHora(ruta.horaSalida) }}
                </p>
              </div>

              <span
                class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                :class="claseEstadoRuta(ruta.estado)"
              >
                {{ ruta.estado }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bus</p>
                <p class="font-bold text-slate-800">
                  {{ ruta.bus?.numero || 'No asignado' }}
                  <span v-if="ruta.bus?.placa" class="font-normal text-slate-500">
                    · {{ ruta.bus.placa }}
                  </span>
                </p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Asientos</p>
                <p class="font-bold text-slate-800">{{ ruta.totalAsientos || 'Sin configurar' }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recorrido</p>
                <p class="font-bold text-slate-800">{{ ruta.esDirecta ? 'Directo' : 'Con paradas' }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tarifa</p>
                <p class="font-bold text-slate-800">Según tipo de asiento</p>
              </div>
            </div>

            <ButtonBase
              full-width
              :disabled="!ruta.bus || !ruta.totalAsientos"
              @click="seleccionarRuta(ruta)"
            >
              <span aria-hidden="true">🎟️</span>
              {{ ruta.bus && ruta.totalAsientos ? 'Vender boletos' : 'Bus no disponible' }}
            </ButtonBase>
          </div>
        </CardBase>
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

      <div
        v-if="errorVenta"
        class="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
      >
        <span aria-hidden="true">⚠️</span>
        <span>{{ errorVenta }}</span>
      </div>

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
import { computed, onMounted, ref } from 'vue'
import CardBase from '../../Components/CardBase.vue'
import InputBase from '../../Components/InputBase.vue'
import ButtonBase from '../../Components/ButtonBase.vue'
import SelectorAsientos from '../../Components/SelectorAsientos.vue'
import FormularioPasajeros from '../../Components/FormularioPasajeros.vue'
import ComprobanteBoletoModal from '../../Components/ComprobanteBoletoModal.vue'
import { useAuthStore } from '../../Store/authStore'
import { useRutas } from '../../Composables/useRutas'
import { useControlBoletos } from '../../Composables/useControlBoletos'
import { useSeleccionCompra } from '../../Composables/useSeleccionCompra'
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
const errorCarga = ref<string | null>(null)
const rutaSeleccionada = ref<RutaDisponible | null>(null)
const metodoPago = ref<MetodoPagoVentanilla>('Efectivo')
const enviando = ref(false)
const errorVenta = ref<string | null>(null)
const mostrarComprobante = ref(false)
const comprobanteBoletos = ref<Boleto[]>([])
const comprobanteContexto = ref<ContextoComprobanteVista | null>(null)

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

const hayFiltros = computed(
  () => Boolean(filtroOrigen.value.trim() || filtroDestino.value.trim() || filtroFecha.value),
)

const ahorro = computed(() =>
  Number((totalBase.value - totalConDescuentos.value).toFixed(2)),
)

const puedeConfirmar = computed(
  () =>
    Boolean(rutaSeleccionada.value) &&
    Boolean(authStore.user?.id) &&
    pasajerosValidos.value &&
    !enviando.value &&
    !cargandoVenta.value,
)

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
    errorCarga.value = MENSAJE_SUPABASE_NO_CONFIGURADO
    return
  }

  cargando.value = true
  errorCarga.value = null

  try {
    await Promise.all([cargarRutas(), cargarFrecuencias(), cargarBuses()])
  } catch (error) {
    errorCarga.value = obtenerMensajeError(
      error,
      'No se pudieron cargar las rutas disponibles para la venta.',
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
}

async function seleccionarRuta(item: RutaDisponible): Promise<void> {
  errorVenta.value = null
  rutaSeleccionada.value = item
  metodoPago.value = 'Efectivo'

  if (!item.ruta.id) {
    errorVenta.value = 'La ruta seleccionada no tiene un identificador válido.'
    return
  }
  if (!item.bus) {
    errorVenta.value = 'No se encontró el bus asignado a esta ruta.'
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
    errorVenta.value = obtenerMensajeError(
      error,
      'No se pudo cargar el mapa de asientos de la ruta.',
    )
  }
}

function volverAlListado(): void {
  rutaSeleccionada.value = null
  errorVenta.value = null
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
  errorVenta.value = null

  const actual = rutaSeleccionada.value
  if (!actual?.ruta.id) {
    errorVenta.value = 'Selecciona una ruta antes de registrar la venta.'
    return
  }
  if (!authStore.user?.id) {
    errorVenta.value = MENSAJE_SESION_REQUERIDA
    return
  }
  if (!pasajerosValidos.value) {
    errorVenta.value = hayCedulasDuplicadas.value
      ? 'No se puede repetir la cédula entre asientos. Corrige los datos de los pasajeros.'
      : 'Completa correctamente los datos de todos los pasajeros.'
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
    await recargarMapa()
  } catch (error) {
    errorVenta.value = obtenerMensajeError(
      error,
      'No se pudo registrar la venta en ventanilla.',
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
