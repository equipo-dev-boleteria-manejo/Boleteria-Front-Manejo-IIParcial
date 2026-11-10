<template>
  <div class="space-y-4 max-w-7xl mx-auto font-sans">
    <!-- Tarjetas de Métricas / KPIs -->
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de pagos por validar">
      <MetricCard
        title="Ventas pendientes"
        :value="cargandoLista && !ventasPendientes.length ? '—' : totalPendientes"
        icon="🧾"
        description="Transferencias por validar"
        variant="default"
      />
      <MetricCard
        title="Monto por validar"
        :value="cargandoLista && !ventasPendientes.length ? '—' : `$${formatearPrecio(montoPendiente)}`"
        icon="💰"
        description="Total en comprobantes"
        variant="info"
      />
      <MetricCard
        title="Con comprobante"
        :value="cargandoLista && !ventasPendientes.length ? '—' : conComprobante"
        icon="📎"
        description="Listas para revisar"
        variant="success"
      />
      <MetricCard
        title="Sin comprobante"
        :value="cargandoLista && !ventasPendientes.length ? '—' : sinComprobante"
        icon="⚠️"
        description="Requieren atención"
        variant="danger"
      />
    </section>

    <!-- Barra de Búsqueda y Filtros Unificada -->
    <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
      <div class="w-full md:w-80">
        <SearchInput
          v-model="busqueda"
          placeholder="Buscar por venta, ruta o vendedor..."
        />
      </div>

      <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
        <SelectFilter
          label="Comprobante:"
          v-model="filtroComprobante"
          :options="opcionesComprobante"
        />

        <SelectFilter
          label="Mostrar:"
          v-model="registrosPorPagina"
          :options="[
            { value: 5, label: '5 filas' },
            { value: 10, label: '10 filas' },
            { value: 20, label: '20 filas' },
          ]"
        />

        <RefreshButton :loading="cargandoLista" @click="recargar" />

        <router-link
          to="/oficinista/venta-boletos"
          class="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-transparent px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
        >
          <span aria-hidden="true">🎟️</span>
          Vender en taquilla
        </router-link>
      </div>
    </div>

    <!-- Estado 1: CARGANDO -->
    <div
      v-if="cargandoLista && !ventasPendientes.length"
      class="rounded-2xl bg-white border border-slate-200 p-12 text-center shadow-sm space-y-4"
      aria-busy="true"
    >
      <div class="animate-spin h-8 w-8 text-blue-600 mx-auto">
        <svg class="w-full h-full" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Buscando transferencias pendientes…</p>
    </div>

    <!-- Estado 2: VACÍO -->
    <div
      v-else-if="!ventasPendientes.length"
      class="rounded-2xl bg-white border border-slate-200 p-16 text-center shadow-sm space-y-3"
    >
      <div class="text-4xl text-slate-300">✅</div>
      <h3 class="text-base font-black text-slate-800">No hay pagos por validar</h3>
      <p class="text-xs text-slate-500 max-w-sm mx-auto">
        Las compras por transferencia aparecerán aquí hasta que apruebes o rechaces el comprobante.
      </p>
    </div>

    <!-- Estado 3: TABLA DE DATOS -->
    <div v-else class="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm border-collapse" aria-label="Ventas pendientes de validación">
          <thead class="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-600 tracking-wider">
            <tr>
              <th scope="col" class="px-6 py-3.5">Venta</th>
              <th scope="col" class="px-6 py-3.5">Ruta</th>
              <th scope="col" class="px-6 py-3.5">Fecha</th>
              <th scope="col" class="px-6 py-3.5">Vendedor</th>
              <th scope="col" class="px-6 py-3.5 text-center">Comprobante</th>
              <th scope="col" class="px-6 py-3.5 text-right">Total</th>
              <th scope="col" class="px-6 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
            <tr
              v-for="venta in ventasPaginadas"
              :key="venta.id"
              class="hover:bg-blue-50/50 transition-colors"
            >
              <td class="px-6 py-3">
                <div class="font-bold text-slate-900 text-sm leading-tight">Venta #{{ venta.id }}</div>
                <div class="text-slate-400 text-xs">{{ venta.metodoPago }}</div>
              </td>
              <td class="px-6 py-3">
                <div class="font-bold text-slate-900">
                  {{ venta.ciudadOrigenVenta }} → {{ venta.ciudadDestinoVenta }}
                </div>
                <div class="text-slate-400 text-xs">Ruta #{{ venta.rutaId }}</div>
              </td>
              <td class="px-6 py-3 text-slate-500">{{ formatearFecha(venta.fechaVenta) }}</td>
              <td class="px-6 py-3">
                <span class="truncate font-mono text-[11px] text-slate-500">
                  {{ venta.usuarioVendedorId || 'No registrado' }}
                </span>
              </td>
              <td class="px-6 py-3 text-center">
                <span
                  class="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-2xs"
                  :class="
                    tieneComprobante(venta)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  "
                >
                  {{ tieneComprobante(venta) ? 'Adjunto' : 'Sin comprobante' }}
                </span>
              </td>
              <td class="px-6 py-3 text-right font-black text-slate-900">
                ${{ formatearPrecio(venta.total) }}
              </td>
              <td class="px-6 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <ButtonBase
                    size="sm"
                    :loading="cargandoDetalle && ventaSeleccionada?.id === venta.id"
                    :disabled="procesando"
                    @click="abrirVenta(venta)"
                  >
                    <span aria-hidden="true">🔍</span>
                    Revisar pago
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
        :total-items="ventasFiltradas.length"
        :items-per-page="registrosPorPagina"
        :has-prev-page="paginaActual > 1"
        :has-next-page="paginaActual < totalPaginas"
        @prev="paginaActual--"
        @next="paginaActual++"
        @set-page="(p) => (paginaActual = p)"
      />
    </div>

    <ModalDetalleVenta
      v-model="modalAbierto"
      :venta="ventaSeleccionada"
      :boletos="boletosVenta"
      :loading="procesando"
      @approve="aprobar"
      @reject="rechazar"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ButtonBase from '../../Components/ButtonBase.vue'
import MetricCard from '../../Components/MetricCard.vue'
import ModalDetalleVenta from '../../Components/ModalDetalleVenta.vue'
import PaginationControls from '../../Components/PaginationControls.vue'
import RefreshButton from '../../Components/RefreshButton.vue'
import SearchInput from '../../Components/SearchInput.vue'
import SelectFilter from '../../Components/SelectFilter.vue'
import { useAuthStore } from '../../Store/authStore'
import { useControlBoletos } from '../../Composables/useControlBoletos'
import { useFeedback } from '../../Composables/useFeedback'
import type { Venta } from '../../../Domain/Entities/Venta'
import {
  MENSAJE_SESION_REQUERIDA,
  MENSAJE_SUPABASE_NO_CONFIGURADO,
  obtenerMensajeError,
  supabaseConfigurado,
} from '../../Utils/configuracion'

const authStore = useAuthStore()
const { showError, showSuccess, confirm } = useFeedback()
const {
  ventasPendientes,
  boletosVenta,
  totalPendientes,
  montoPendiente,
  loading,
  cargarVentasPendientes,
  cargarBoletosVenta,
  aprobarPago,
  rechazarPago,
} = useControlBoletos()

const modalAbierto = ref(false)
const ventaSeleccionada = ref<Venta | null>(null)
const cargandoDetalle = ref(false)
const procesando = ref(false)
const cargandoLista = computed(() => loading.value && !procesando.value)

// Filtros y paginación
const busqueda = ref('')
const filtroComprobante = ref<string>('Todos')
const paginaActual = ref(1)
const registrosPorPagina = ref(10)

const opcionesComprobante = [
  { value: 'Todos', label: 'Todos' },
  { value: 'ConComprobante', label: 'Con comprobante' },
  { value: 'SinComprobante', label: 'Sin comprobante' },
]

function formatearPrecio(valor: number): string {
  return Number(valor ?? 0).toFixed(2)
}

function formatearFecha(valor?: Date | string | null): string {
  if (!valor) return 'Fecha no registrada'
  const fecha = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(fecha.getTime())) return 'Fecha no registrada'
  return fecha.toLocaleString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function tieneComprobante(venta: Venta): boolean {
  return Boolean(venta.comprobanteUrl && venta.comprobanteUrl.trim())
}

const conComprobante = computed(
  () => ventasPendientes.value.filter(tieneComprobante).length,
)
const sinComprobante = computed(
  () => ventasPendientes.value.length - conComprobante.value,
)

const ventasFiltradas = computed(() =>
  ventasPendientes.value.filter((venta) => {
    const termino = busqueda.value.toLowerCase().trim()
    const coincideBusqueda =
      !termino ||
      String(venta.id ?? '').includes(termino) ||
      `${venta.ciudadOrigenVenta} ${venta.ciudadDestinoVenta}`
        .toLowerCase()
        .includes(termino) ||
      String(venta.usuarioVendedorId ?? '').toLowerCase().includes(termino)

    const tiene = tieneComprobante(venta)
    const coincideComprobante =
      filtroComprobante.value === 'Todos' ||
      (filtroComprobante.value === 'ConComprobante' && tiene) ||
      (filtroComprobante.value === 'SinComprobante' && !tiene)

    return coincideBusqueda && coincideComprobante
  }),
)

const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(ventasFiltradas.value.length / registrosPorPagina.value)),
)

const ventasPaginadas = computed(() => {
  const inicio = (paginaActual.value - 1) * registrosPorPagina.value
  return ventasFiltradas.value.slice(inicio, inicio + registrosPorPagina.value)
})

watch([busqueda, filtroComprobante, registrosPorPagina], () => {
  paginaActual.value = 1
})

async function recargar(): Promise<void> {
  if (!supabaseConfigurado) {
    showError(MENSAJE_SUPABASE_NO_CONFIGURADO)
    return
  }

  try {
    await cargarVentasPendientes()
    paginaActual.value = 1
  } catch (error) {
    showError(
      obtenerMensajeError(error, 'No se pudieron cargar las ventas pendientes de validación.'),
    )
  }
}

async function abrirVenta(venta: Venta): Promise<void> {
  if (!venta.id) {
    showError('La venta seleccionada no tiene un identificador válido.')
    return
  }

  ventaSeleccionada.value = venta
  cargandoDetalle.value = true

  try {
    await cargarBoletosVenta(venta.id)
    modalAbierto.value = true
  } catch (error) {
    showError(
      obtenerMensajeError(error, 'No se pudieron cargar los boletos de la venta seleccionada.'),
    )
  } finally {
    cargandoDetalle.value = false
  }
}

function cerrarModal(): void {
  modalAbierto.value = false
  ventaSeleccionada.value = null
}

async function aprobar(): Promise<void> {
  const venta = ventaSeleccionada.value
  if (!venta?.id) return

  if (!authStore.user?.id) {
    showError(MENSAJE_SESION_REQUERIDA)
    return
  }
  if (!tieneComprobante(venta)) {
    showError('Esta venta no tiene un comprobante asociado y no puede aprobarse.')
    return
  }
  if (!boletosVenta.value.length) {
    showError('No se encontraron boletos asociados a esta venta. No es posible aprobarla.')
    return
  }

  const confirmado = await confirm({
    title: 'Aprobar pago',
    message: `¿Confirmas que el comprobante de la venta #${venta.id} por $${formatearPrecio(
      venta.total,
    )} es válido? Los boletos quedarán emitidos.`,
    confirmText: 'Aprobar pago',
    cancelText: 'Cancelar',
    type: 'warning',
  })
  if (!confirmado) return

  procesando.value = true
  try {
    await aprobarPago(venta.id, authStore.user.id)
    cerrarModal()
    showSuccess(`La venta #${venta.id} fue aprobada y sus boletos ya están emitidos.`)
    await recargar()
  } catch (error) {
    showError(obtenerMensajeError(error, 'Ocurrió un error al aprobar la venta.'))
  } finally {
    procesando.value = false
  }
}

async function rechazar(observacion: string): Promise<void> {
  const venta = ventaSeleccionada.value
  if (!venta?.id) return

  if (!authStore.user?.id) {
    showError(MENSAJE_SESION_REQUERIDA)
    return
  }

  const confirmado = await confirm({
    title: 'Rechazar pago',
    message: observacion
      ? `¿Confirmas rechazar la venta #${venta.id}? Motivo: ${observacion}`
      : `¿Confirmas rechazar la venta #${venta.id}? Sus boletos serán cancelados.`,
    confirmText: 'Rechazar pago',
    cancelText: 'Cancelar',
    type: 'warning',
  })
  if (!confirmado) return

  procesando.value = true
  try {
    await rechazarPago(venta.id, authStore.user.id, observacion || undefined)
    cerrarModal()
    showSuccess(`La venta #${venta.id} fue rechazada y sus boletos quedaron cancelados.`)
    await recargar()
  } catch (error) {
    showError(obtenerMensajeError(error, 'Ocurrió un error al rechazar la venta.'))
  } finally {
    procesando.value = false
  }
}

onMounted(() => {
  void recargar()
})
</script>
