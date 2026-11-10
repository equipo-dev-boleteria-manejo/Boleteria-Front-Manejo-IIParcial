<template>
  <div class="space-y-4 max-w-7xl mx-auto font-sans">
    <!-- Tarjetas de Métricas / KPIs -->
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de boletos">
      <MetricCard
        title="Total Boletos"
        :value="loading && !boletos.length ? '—' : totalBoletos"
        icon="🎫"
        description="En tus compras registradas"
        variant="default"
      />
      <MetricCard
        title="Emitidos"
        :value="loading && !boletos.length ? '—' : boletosEmitidos"
        icon="✅"
        description="Listos para abordar"
        variant="success"
      />
      <MetricCard
        title="Por validar"
        :value="loading && !boletos.length ? '—' : boletosPendientes"
        icon="⏳"
        description="Esperando aprobación"
        variant="warning"
      />
      <MetricCard
        title="Total gastado"
        :value="loading && !boletos.length ? '—' : `$${formatearPrecio(totalGastado)}`"
        icon="💳"
        description="Invertido en pasajes"
        variant="info"
      />
    </section>

    <!-- Barra de Búsqueda y Filtros Unificada -->
    <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
      <div class="w-full md:w-80">
        <SearchInput
          v-model="cedula"
          placeholder="Ingresa la cédula del pasajero (10 dígitos)..."
        />
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

        <ButtonBase type="submit" :loading="loading" :disabled="loading" @click="buscar">
          <span aria-hidden="true">🔎</span>
          Consultar
        </ButtonBase>

        <RefreshButton :loading="loading" @click="buscar" />
      </div>
    </div>

    <p class="text-[11px] leading-relaxed text-slate-400">
      Consulta con la cédula registrada al momento de la compra. Si iniciaste sesión,
      usamos automáticamente la cédula de tu perfil.
    </p>

    <!-- Estado 1: CARGANDO -->
    <div
      v-if="loading && !boletos.length"
      class="rounded-2xl bg-white border border-slate-200 p-12 text-center shadow-sm space-y-4"
      aria-busy="true"
    >
      <div class="animate-spin h-8 w-8 text-blue-600 mx-auto">
        <svg class="w-full h-full" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Buscando tus boletos…</p>
    </div>

    <!-- Estado 2: VACÍO -->
    <div
      v-else-if="!grupos.length"
      class="rounded-2xl bg-white border border-slate-200 p-16 text-center shadow-sm space-y-3"
    >
      <div class="text-4xl text-slate-300">🎫</div>
      <h3 class="text-base font-black text-slate-800">No encontramos boletos</h3>
      <p class="text-xs text-slate-500 max-w-sm mx-auto">
        Revisa que la cédula sea correcta o realiza una compra en la sección de búsqueda de rutas.
      </p>
    </div>

    <!-- Estado 3: TABLA DE DATOS -->
    <div v-else class="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm border-collapse" aria-label="Historial de boletos">
          <thead class="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-600 tracking-wider">
            <tr>
              <th scope="col" class="px-6 py-3.5">Venta</th>
              <th scope="col" class="px-6 py-3.5">Ruta</th>
              <th scope="col" class="px-6 py-3.5">Fecha</th>
              <th scope="col" class="px-6 py-3.5 text-center">Boletos</th>
              <th scope="col" class="px-6 py-3.5 text-right">Total</th>
              <th scope="col" class="px-6 py-3.5 text-center">Estado</th>
              <th scope="col" class="px-6 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
            <tr
              v-for="grupo in gruposPaginados"
              :key="grupo.ventaId"
              class="hover:bg-blue-50/50 transition-colors"
            >
              <td class="px-6 py-3">
                <div class="font-bold text-slate-900 text-sm leading-tight">Venta #{{ grupo.ventaId }}</div>
                <div class="text-slate-400 text-xs">Ruta #{{ grupo.rutaId }}</div>
              </td>
              <td class="px-6 py-3">
                <span class="font-bold text-slate-900">{{ etiquetaRuta(grupo) }}</span>
              </td>
              <td class="px-6 py-3 text-slate-500">{{ formatearFechaGrupo(grupo) }}</td>
              <td class="px-6 py-3 text-center">
                <span class="inline-flex items-center justify-center rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 text-[11px] font-bold">
                  {{ grupo.boletos.length }}
                </span>
              </td>
              <td class="px-6 py-3 text-right font-black text-slate-900">
                ${{ formatearPrecio(grupo.total) }}
              </td>
              <td class="px-6 py-3 text-center">
                <span
                  class="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-2xs"
                  :class="claseEstado(grupo.estado)"
                >
                  {{ grupo.estado }}
                </span>
              </td>
              <td class="px-6 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <ButtonBase size="sm" variant="outline" @click="abrirComprobante(grupo)">
                    <span aria-hidden="true">🧾</span>
                    Comprobante
                  </ButtonBase>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationControls
        :current-page="paginaActual"
        :total-pages="totalPaginas"
        :total-items="grupos.length"
        :items-per-page="registrosPorPagina"
        :has-prev-page="paginaActual > 1"
        :has-next-page="paginaActual < totalPaginas"
        @prev="paginaActual--"
        @next="paginaActual++"
        @set-page="(p) => (paginaActual = p)"
      />
    </div>

    <ComprobanteBoletoModal
      v-model="mostrarComprobante"
      :boletos="boletosSeleccionados"
      :contexto="comprobanteContexto"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ButtonBase from '../../Components/ButtonBase.vue'
import MetricCard from '../../Components/MetricCard.vue'
import PaginationControls from '../../Components/PaginationControls.vue'
import RefreshButton from '../../Components/RefreshButton.vue'
import SearchInput from '../../Components/SearchInput.vue'
import SelectFilter from '../../Components/SelectFilter.vue'
import ComprobanteBoletoModal from '../../Components/ComprobanteBoletoModal.vue'
import { useAuthStore } from '../../Store/authStore'
import { useTickets } from '../../Composables/useTickets'
import { useRutas } from '../../Composables/useRutas'
import { useFeedback } from '../../Composables/useFeedback'
import type { Boleto } from '../../../Domain/Entities/Boleto'
import type { RutaDisponible } from '../../Utils/rutasDisponibles'
import { construirRutasDisponibles } from '../../Utils/rutasDisponibles'
import {
  MENSAJE_SUPABASE_NO_CONFIGURADO,
  obtenerMensajeError,
  supabaseConfigurado,
} from '../../Utils/configuracion'

interface GrupoBoletos {
  ventaId: number
  rutaId: number
  boletos: Boleto[]
  total: number
  estado: string
  creadoEn: number
  ruta: RutaDisponible | null
}

interface ContextoComprobanteVista {
  origen?: string
  destino?: string
  fecha?: string
  horaSalida?: string
  estado?: string
  total?: number
  ventaId?: number
}

const authStore = useAuthStore()
const { boletos, loading, gruposPorVenta, totalBoletos, totalGastado, cargarHistorial } = useTickets()
const {
  rutas,
  buses,
  frecuencias,
  cargarRutas,
  cargarBuses,
  cargarFrecuencias,
} = useRutas()
const { showError } = useFeedback()

const cedula = ref(authStore.user?.cedula ?? '')
const mostrarComprobante = ref(false)
const grupoSeleccionado = ref<GrupoBoletos | null>(null)

const paginaActual = ref(1)
const registrosPorPagina = ref(10)

const rutasPorId = computed(() => {
  const mapa = new Map<number, RutaDisponible>()
  construirRutasDisponibles(rutas.value, frecuencias.value, buses.value, {
    incluirNoVendibles: true,
  }).forEach((item) => {
    if (item.ruta.id !== undefined) mapa.set(item.ruta.id, item)
  })
  return mapa
})

const grupos = computed<GrupoBoletos[]>(() =>
  gruposPorVenta.value.map((grupo) => ({
    ...grupo,
    ruta: rutasPorId.value.get(grupo.rutaId) ?? null,
  })),
)

const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(grupos.value.length / registrosPorPagina.value)),
)

const gruposPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * registrosPorPagina.value
  return grupos.value.slice(inicio, inicio + registrosPorPagina.value)
})

const boletosEmitidos = computed(
  () =>
    boletos.value.filter((boleto) => {
      const estado = String(boleto.estado ?? '').toLowerCase()
      return (
        estado.includes('emitido') ||
        estado.includes('aprobado') ||
        estado.includes('abordado')
      )
    }).length,
)

const boletosPendientes = computed(
  () =>
    boletos.value.filter((boleto) => {
      const estado = String(boleto.estado ?? '').toLowerCase()
      return estado.includes('proceso') || estado.includes('pendiente')
    }).length,
)

const boletosSeleccionados = computed(() => grupoSeleccionado.value?.boletos ?? [])

const comprobanteContexto = computed<ContextoComprobanteVista | null>(() => {
  const grupo = grupoSeleccionado.value
  if (!grupo) return null

  return {
    origen: grupo.ruta?.origen,
    destino: grupo.ruta?.destino,
    fecha: grupo.ruta?.fecha,
    horaSalida: grupo.ruta?.horaSalida,
    estado: grupo.estado,
    total: grupo.total,
    ventaId: grupo.ventaId,
  }
})

watch(registrosPorPagina, () => {
  paginaActual.value = 1
})

function formatearPrecio(valor: number): string {
  return Number(valor ?? 0).toFixed(2)
}

function etiquetaRuta(grupo: GrupoBoletos): string {
  if (!grupo.ruta) return `Ruta #${grupo.rutaId}`
  return `${grupo.ruta.origen} → ${grupo.ruta.destino}`
}

function formatearFechaGrupo(grupo: GrupoBoletos): string {
  const fecha = grupo.ruta?.fecha
  if (fecha) {
    const fechaDate = new Date(`${fecha}T00:00:00`)
    if (!Number.isNaN(fechaDate.getTime())) {
      return fechaDate.toLocaleDateString('es-EC', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    }
  }

  const creado = grupo.boletos.find((boleto) => boleto.createdAt)?.createdAt
  if (creado) {
    const fechaDate = new Date(creado)
    if (!Number.isNaN(fechaDate.getTime())) {
      return fechaDate.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    }
  }

  return 'Fecha por confirmar'
}

function claseEstado(valor: string): string {
  const estado = String(valor ?? '').toLowerCase()
  if (estado.includes('cancel')) {
    return 'bg-red-50 text-red-700 ring-1 ring-red-200'
  }
  if (estado.includes('proceso') || estado.includes('pendiente')) {
    return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  }
  if (estado.includes('abord')) {
    return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
  }
  return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
}

async function cargarCatalogoRutas(): Promise<void> {
  try {
    await Promise.all([cargarRutas(), cargarFrecuencias(), cargarBuses()])
  } catch {
    /* El catálogo de rutas solo enriquece la vista; no bloquea los boletos. */
  }
}

async function cargarHistorialActual(): Promise<void> {
  const valor = cedula.value.replace(/\D/g, '').trim()
  cedula.value = valor

  if (!supabaseConfigurado) {
    showError(MENSAJE_SUPABASE_NO_CONFIGURADO)
    return
  }
  if (!valor) {
    showError('Ingresa la cédula del pasajero para consultar sus boletos.')
    return
  }

  try {
    await cargarHistorial(valor)
    paginaActual.value = 1
  } catch (error) {
    showError(
      obtenerMensajeError(error, 'No se pudo cargar el historial de boletos.'),
    )
  }
}

function buscar(): void {
  void cargarHistorialActual()
}

function abrirComprobante(grupo: GrupoBoletos): void {
  grupoSeleccionado.value = grupo
  mostrarComprobante.value = true
}

watch(
  () => authStore.user,
  (usuarioActual) => {
    if (usuarioActual?.cedula && !cedula.value) {
      cedula.value = usuarioActual.cedula
      void cargarHistorialActual()
    }
  },
  { immediate: true },
)

onMounted(() => {
  if (!supabaseConfigurado) {
    showError(MENSAJE_SUPABASE_NO_CONFIGURADO)
    return
  }

  void cargarCatalogoRutas()

  if (cedula.value) {
    void cargarHistorialActual()
  }
})
</script>
