<template>
  <div class="space-y-6">
    <CardBase
      title="Aprobación de Transferencias"
      subtitle="Valida comprobantes bancarios y emite los boletos pendientes"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="grid w-full grid-cols-2 gap-3 sm:w-auto">
          <div class="rounded-2xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200 sm:px-4 sm:py-3">
            <p class="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Ventas pendientes
            </p>
            <p class="text-xl font-black leading-tight text-amber-800 sm:text-2xl">{{ totalPendientes }}</p>
          </div>
          <div class="rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200 sm:px-4 sm:py-3">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Monto por validar
            </p>
            <p class="text-xl font-black leading-tight text-slate-900 sm:text-2xl">
              ${{ formatearPrecio(montoPendiente) }}
            </p>
          </div>
        </div>

        <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <a
            href="/oficinista/venta-boletos"
            class="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <span aria-hidden="true">🎟️</span>
            Vender en taquilla
          </a>
          <ButtonBase
            variant="outline"
            :loading="cargandoLista"
            :disabled="cargandoLista"
            @click="recargar"
          >
            <span aria-hidden="true">🔄</span>
            Recargar
          </ButtonBase>
        </div>
      </div>
    </CardBase>

    <div
      v-if="errorCarga"
      class="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
    >
      <span aria-hidden="true">⚠️</span>
      <span>{{ errorCarga }}</span>
    </div>

    <div
      v-if="cargandoLista && !ventasPendientes.length"
      class="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-sm text-slate-500"
    >
      <span class="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      Buscando transferencias pendientes…
    </div>

    <div
      v-else-if="!ventasPendientes.length && !errorCarga"
      class="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center"
    >
      <span class="block text-4xl" aria-hidden="true">✅</span>
      <h3 class="mt-2 text-sm font-bold text-slate-700">No hay pagos por validar</h3>
      <p class="mt-1 text-xs text-slate-500">
        Las compras por transferencia aparecerán aquí hasta que apruebes o rechaces el comprobante.
      </p>
    </div>

    <div v-else class="grid grid-cols-1 gap-4">
      <CardBase
        v-for="venta in ventasPendientes"
        :key="venta.id"
        hover
        padding="sm"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Venta #{{ venta.id }}
              </p>
              <span class="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
                {{ venta.estado }}
              </span>
              <span
                class="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                :class="
                  tieneComprobante(venta)
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                "
              >
                {{ tieneComprobante(venta) ? 'Comprobante adjunto' : 'Sin comprobante' }}
              </span>
            </div>

            <h3 class="mt-1 text-base font-black leading-tight text-slate-900">
              {{ venta.ciudadOrigenVenta }} → {{ venta.ciudadDestinoVenta }}
            </h3>
            <p class="mt-1 text-xs font-semibold text-slate-500">
              {{ formatearFecha(venta.fechaVenta) }} · Ruta #{{ venta.rutaId }} ·
              {{ venta.metodoPago }}
            </p>

            <p class="mt-2 truncate font-mono text-[11px] text-slate-400">
              Vendedor: {{ venta.usuarioVendedorId || 'No registrado' }}
            </p>
          </div>

          <div class="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <div class="flex items-center justify-between gap-3 sm:block sm:text-right">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</p>
              <p class="text-lg font-black text-slate-900 sm:text-xl">${{ formatearPrecio(venta.total) }}</p>
            </div>
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
        </div>
      </CardBase>
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
import { computed, onMounted, ref } from 'vue'
import CardBase from '../../Components/CardBase.vue'
import ButtonBase from '../../Components/ButtonBase.vue'
import ModalDetalleVenta from '../../Components/ModalDetalleVenta.vue'
import { useAuthStore } from '../../Store/authStore'
import { useUiStore } from '../../Store/uiStore'
import { useControlBoletos } from '../../Composables/useControlBoletos'
import type { Venta } from '../../../Domain/Entities/Venta'
import {
  MENSAJE_SESION_REQUERIDA,
  MENSAJE_SUPABASE_NO_CONFIGURADO,
  obtenerMensajeError,
  supabaseConfigurado,
} from '../../Utils/configuracion'

const authStore = useAuthStore()
const uiStore = useUiStore()
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

const errorCarga = ref<string | null>(null)
const modalAbierto = ref(false)
const ventaSeleccionada = ref<Venta | null>(null)
const cargandoDetalle = ref(false)
const procesando = ref(false)
const cargandoLista = computed(() => loading.value && !procesando.value)

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

async function recargar(): Promise<void> {
  if (!supabaseConfigurado) {
    errorCarga.value = MENSAJE_SUPABASE_NO_CONFIGURADO
    return
  }

  errorCarga.value = null
  try {
    await cargarVentasPendientes()
  } catch (error) {
    errorCarga.value = obtenerMensajeError(
      error,
      'No se pudieron cargar las ventas pendientes de validación.',
    )
  }
}

async function abrirVenta(venta: Venta): Promise<void> {
  if (!venta.id) {
    errorCarga.value = 'La venta seleccionada no tiene un identificador válido.'
    return
  }

  errorCarga.value = null
  ventaSeleccionada.value = venta
  cargandoDetalle.value = true

  try {
    await cargarBoletosVenta(venta.id)
    modalAbierto.value = true
  } catch (error) {
    errorCarga.value = obtenerMensajeError(
      error,
      'No se pudieron cargar los boletos de la venta seleccionada.',
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
    uiStore.showAlert({
      title: 'Sesión requerida',
      message: MENSAJE_SESION_REQUERIDA,
      type: 'error',
    })
    return
  }
  if (!tieneComprobante(venta)) {
    uiStore.showAlert({
      title: 'Comprobante requerido',
      message: 'Esta venta no tiene un comprobante asociado y no puede aprobarse.',
      type: 'warning',
    })
    return
  }
  if (!boletosVenta.value.length) {
    uiStore.showAlert({
      title: 'Boletos no encontrados',
      message: 'No se encontraron boletos asociados a esta venta. No es posible aprobarla.',
      type: 'warning',
    })
    return
  }

  const confirmado = await uiStore.showConfirm({
    title: 'Aprobar pago',
    message: `¿Confirmas que el comprobante de la venta #${venta.id} por $${formatearPrecio(
      venta.total,
    )} es válido? Los boletos quedarán emitidos.`,
    type: 'warning',
    confirmText: 'Aprobar pago',
    cancelText: 'Cancelar',
  })
  if (!confirmado) return

  procesando.value = true
  try {
    await aprobarPago(venta.id, authStore.user.id)
    cerrarModal()
    uiStore.showAlert({
      title: 'Pago aprobado',
      message: `La venta #${venta.id} fue aprobada y sus boletos ya están emitidos.`,
      type: 'success',
    })
    await recargar()
  } catch (error) {
    uiStore.showAlert({
      title: 'No se pudo aprobar el pago',
      message: obtenerMensajeError(error, 'Ocurrió un error al aprobar la venta.'),
      type: 'error',
    })
  } finally {
    procesando.value = false
  }
}

async function rechazar(observacion: string): Promise<void> {
  const venta = ventaSeleccionada.value
  if (!venta?.id) return

  if (!authStore.user?.id) {
    uiStore.showAlert({
      title: 'Sesión requerida',
      message: MENSAJE_SESION_REQUERIDA,
      type: 'error',
    })
    return
  }

  const confirmado = await uiStore.showConfirm({
    title: 'Rechazar pago',
    message: observacion
      ? `¿Confirmas rechazar la venta #${venta.id}? Motivo: ${observacion}`
      : `¿Confirmas rechazar la venta #${venta.id}? Sus boletos serán cancelados.`,
    type: 'warning',
    confirmText: 'Rechazar pago',
    cancelText: 'Cancelar',
  })
  if (!confirmado) return

  procesando.value = true
  try {
    await rechazarPago(venta.id, authStore.user.id, observacion || undefined)
    cerrarModal()
    uiStore.showAlert({
      title: 'Pago rechazado',
      message: `La venta #${venta.id} fue rechazada y sus boletos quedaron cancelados.`,
      type: 'success',
    })
    await recargar()
  } catch (error) {
    uiStore.showAlert({
      title: 'No se pudo rechazar el pago',
      message: obtenerMensajeError(error, 'Ocurrió un error al rechazar la venta.'),
      type: 'error',
    })
  } finally {
    procesando.value = false
  }
}

onMounted(() => {
  void recargar()
})
</script>
