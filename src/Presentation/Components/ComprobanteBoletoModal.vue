<template>
  <ModalBase
    :model-value="modelValue"
    title="Comprobante de compra"
    max-width="2xl"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="comprobante-print space-y-5">
      <div
        v-if="generando"
        class="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs font-semibold text-blue-700"
        role="status"
      >
        <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        Generando códigos de abordaje…
      </div>

      <div
        v-if="errorCodigos"
        class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-800"
        role="alert"
      >
        <span aria-hidden="true">⚠️</span>
        <span>{{ errorCodigos }}</span>
      </div>

      <section
        v-if="contexto?.mensaje"
        class="rounded-2xl border px-4 py-3"
        :class="
          esPendiente
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        "
      >
        <p class="text-sm font-bold">{{ esPendiente ? 'Compra registrada' : '¡Compra confirmada!' }}</p>
        <p class="mt-0.5 text-xs font-medium">{{ contexto.mensaje }}</p>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {{ ventaId ? `Venta #${ventaId}` : 'Resumen de compra' }}
            </p>
            <h3 class="mt-0.5 text-base font-black text-slate-900">
              {{ origen || 'Origen' }} → {{ destino || 'Destino' }}
            </h3>
            <p class="mt-0.5 text-xs text-slate-500">
              {{ fecha ?? 'Fecha por confirmar' }}
              <span v-if="horaSalida"> · Salida {{ horaSalida }}</span>
            </p>
          </div>

          <div class="text-right">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</p>
            <p class="text-xl font-black text-slate-900">${{ formatearPrecio(total) }}</p>
            <p class="text-[11px] font-semibold text-slate-500">{{ metodoPago || 'Pago registrado' }}</p>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
          <span class="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
            {{ boletos.length }} {{ boletos.length === 1 ? 'boleto' : 'boletos' }}
          </span>
          <span
            v-if="estado"
            class="rounded-full px-2.5 py-1 ring-1"
            :class="claseEstado(estado)"
          >
            {{ estado }}
          </span>
        </div>
      </section>

      <div
        v-if="!boletos.length"
        class="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500"
      >
        No hay boletos para mostrar en este comprobante.
      </div>

      <article
        v-for="(boleto, index) in boletos"
        :key="boleto.id ?? `${boleto.asientoId}-${index}`"
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Boleto {{ index + 1 }}
            </p>
            <p class="text-sm font-black text-slate-900">
              {{ boleto.nombresPasajero }} {{ boleto.apellidosPasajero }}
            </p>
          </div>

          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-bold ring-1"
            :class="claseEstado(boleto.estado)"
          >
            {{ boleto.estado }}
          </span>
        </div>

        <div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-[auto_1fr]">
          <div class="flex items-center gap-3">
            <canvas
              :ref="(el) => asignarRefQr(el, index)"
              class="h-[118px] w-[118px] rounded-xl border border-slate-200 bg-white p-1"
              width="118"
              height="118"
              aria-label="Código QR del boleto"
            />
            <div class="space-y-2 sm:hidden">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Asiento</p>
              <p class="text-2xl font-black text-blue-600">#{{ boleto.asientoId }}</p>
            </div>
          </div>

          <div class="min-w-0 space-y-3">
            <div class="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Asiento</p>
                <p class="font-bold text-slate-900">#{{ boleto.asientoId }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cédula</p>
                <p class="font-bold text-slate-900">{{ boleto.cedulaPasajero }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tarifa</p>
                <p class="font-bold text-slate-900">${{ formatearPrecio(boleto.precioFinal) }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipo</p>
                <p class="font-bold text-slate-900">{{ boleto.tipoPasajero }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ruta</p>
                <p class="font-bold text-slate-900">#{{ boleto.rutaId }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Venta</p>
                <p class="font-bold text-slate-900">#{{ boleto.ventaId }}</p>
              </div>
            </div>

            <div class="rounded-xl bg-slate-50 px-3 py-2">
              <canvas
                :ref="(el) => asignarRefCodigoBarras(el, index)"
                class="h-11 w-full"
                aria-label="Código de barras del boleto"
              />
              <p class="mt-1 truncate text-center font-mono text-[10px] text-slate-400">
                {{ boleto.codigoBarras || 'Sin código de barras' }}
              </p>
            </div>
          </div>
        </div>
      </article>

      <p class="text-[11px] leading-relaxed text-slate-400">
        Presenta el código QR o el código de barras al momento del abordaje. Conserva este
        comprobante hasta finalizar el viaje.
      </p>
    </div>

    <template #footer="{ close }">
      <ButtonBase variant="outline" size="sm" @click="imprimir">
        <span aria-hidden="true">🖨️</span>
        Imprimir
      </ButtonBase>
      <ButtonBase size="sm" @click="close">Cerrar</ButtonBase>
    </template>
  </ModalBase>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import ModalBase from './ModalBase.vue'
import ButtonBase from './ButtonBase.vue'
import type { Boleto } from '../../Domain/Entities/Boleto'
import type { Venta } from '../../Domain/Entities/Venta'

export interface ContextoComprobante {
  origen?: string
  destino?: string
  fecha?: string
  horaSalida?: string
  metodoPago?: string
  estado?: string
  total?: number
  ventaId?: number
  mensaje?: string
}

interface Props {
  modelValue: boolean
  boletos?: Boleto[]
  venta?: Venta | null
  contexto?: ContextoComprobante | null
}

const props = withDefaults(defineProps<Props>(), {
  boletos: () => [],
  venta: null,
  contexto: null,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const refsQr = ref<Array<HTMLCanvasElement | null>>([])
const refsCodigoBarras = ref<Array<HTMLCanvasElement | null>>([])
const generando = ref(false)
const errorCodigos = ref<string | null>(null)

const ventaId = computed<number | undefined>(
  () => props.venta?.id ?? props.contexto?.ventaId ?? props.boletos[0]?.ventaId,
)

const origen = computed(
  () => props.contexto?.origen ?? props.venta?.ciudadOrigenVenta ?? '',
)
const destino = computed(
  () => props.contexto?.destino ?? props.venta?.ciudadDestinoVenta ?? '',
)

const metodoPago = computed(
  () => props.contexto?.metodoPago ?? props.venta?.metodoPago ?? '',
)

const estado = computed(() => {
  const desdeContexto = props.contexto?.estado
  if (desdeContexto) return desdeContexto
  if (props.boletos.length && props.boletos.every((boleto) => boleto.estado === props.boletos[0].estado)) {
    return props.boletos[0].estado
  }
  return ''
})

const total = computed(() => {
  if (props.contexto?.total != null) return Number(props.contexto.total)
  if (props.venta?.total != null) return Number(props.venta.total)
  return props.boletos.reduce(
    (acumulado, boleto) => acumulado + Number(boleto.precioFinal ?? 0),
    0,
  )
})

const esPendiente = computed(() => {
  const estadoNormalizado = String(estado.value).toLowerCase()
  return (
    estadoNormalizado.includes('proceso') ||
    estadoNormalizado.includes('pendiente') ||
    estadoNormalizado.includes('validaci')
  )
})

const fecha = computed(() => {
  if (props.contexto?.fecha) return formatearFecha(props.contexto.fecha)
  const creado = props.boletos.find((boleto) => boleto.createdAt)?.createdAt
  return creado ? formatearFecha(creado.toISOString()) : ''
})

const horaSalida = computed(() => props.contexto?.horaSalida ?? '')

function asignarRefQr(
  el: Element | ComponentPublicInstance | null,
  index: number,
): void {
  refsQr.value[index] = el instanceof HTMLCanvasElement ? el : null
}

function asignarRefCodigoBarras(
  el: Element | ComponentPublicInstance | null,
  index: number,
): void {
  refsCodigoBarras.value[index] = el instanceof HTMLCanvasElement ? el : null
}

async function generarCodigos(): Promise<void> {
  generando.value = true
  errorCodigos.value = null
  let fallos = 0

  try {
    await nextTick()

    for (let index = 0; index < props.boletos.length; index++) {
      const boleto = props.boletos[index]
      const canvasQr = refsQr.value[index]
      const canvasBarras = refsCodigoBarras.value[index]

      if (canvasQr) {
        try {
          await QRCode.toCanvas(
            canvasQr,
            boleto.codigoQr || `BOLETO-${boleto.id ?? index}`,
            {
              width: 118,
              margin: 1,
              color: { dark: '#0f172a', light: '#ffffff' },
            },
          )
        } catch (err: unknown) {
          fallos++
          console.warn('No se pudo generar el código QR del boleto:', err)
        }
      }

      if (canvasBarras) {
        try {
          JsBarcode(canvasBarras, boleto.codigoBarras || `BOLETO-${boleto.id ?? index}`, {
            format: 'CODE128',
            width: 1.3,
            height: 38,
            displayValue: false,
            margin: 0,
            background: '#f8fafc',
            lineColor: '#0f172a',
          })
        } catch (err: unknown) {
          fallos++
          console.warn('No se pudo generar el código de barras del boleto:', err)
        }
      }
    }

    if (fallos > 0) {
      errorCodigos.value = `No se pudieron generar ${fallos} código(s) de abordaje. Puedes cerrar el comprobante e intentarlo de nuevo.`
    }
  } finally {
    generando.value = false
  }
}

function formatearPrecio(valor: number): string {
  return Number(valor ?? 0).toFixed(2)
}

function formatearFecha(valor: string): string {
  const fechaDate = new Date(valor.length === 10 ? `${valor}T00:00:00` : valor)
  if (Number.isNaN(fechaDate.getTime())) return valor
  return fechaDate.toLocaleDateString('es-EC', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function claseEstado(valor: string): string {
  const estadoNormalizado = String(valor ?? '').toLowerCase()
  if (estadoNormalizado.includes('cancel')) {
    return 'bg-red-50 text-red-700 ring-red-200'
  }
  if (estadoNormalizado.includes('proceso') || estadoNormalizado.includes('pendiente')) {
    return 'bg-amber-50 text-amber-700 ring-amber-200'
  }
  if (estadoNormalizado.includes('abord')) {
    return 'bg-blue-50 text-blue-700 ring-blue-200'
  }
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
}

function imprimir(): void {
  window.print()
}

watch(
  () => [props.modelValue, props.boletos] as const,
  ([abierto]) => {
    if (abierto) void generarCodigos()
  },
  { deep: true },
)

onMounted(() => {
  if (props.modelValue) void generarCodigos()
})
</script>

<style>
@media print {
  body * {
    visibility: hidden !important;
  }

  .comprobante-print,
  .comprobante-print * {
    visibility: visible !important;
  }

  .comprobante-print {
    position: absolute;
    inset: 0 auto auto 0;
    width: 100%;
    padding: 24px;
    background: #ffffff;
  }

  .comprobante-print article {
    break-inside: avoid;
  }
}
</style>
