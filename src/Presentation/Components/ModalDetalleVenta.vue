<template>
  <ModalBase
    :model-value="modelValue"
    title="Detalle de la venta"
    max-width="2xl"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="!venta" class="py-10 text-center text-sm text-slate-500">
      No se encontró la venta seleccionada.
    </div>

    <div v-else class="space-y-5">
      <section class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Venta #{{ venta.id }}
            </p>
            <h3 class="mt-0.5 text-base font-black text-slate-900">
              {{ venta.ciudadOrigenVenta }} → {{ venta.ciudadDestinoVenta }}
            </h3>
            <p class="mt-0.5 text-xs text-slate-500">
              {{ formatearFecha(venta.fechaVenta) }} · Ruta #{{ venta.rutaId }}
            </p>
          </div>

          <div class="text-right">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</p>
            <p class="text-xl font-black text-slate-900">${{ formatearPrecio(venta.total) }}</p>
            <span class="mt-1 inline-block rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
              {{ venta.estado }}
            </span>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Método de pago</p>
            <p class="font-bold text-slate-900">{{ venta.metodoPago }}</p>
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vendedor</p>
            <p class="truncate font-bold text-slate-900">{{ venta.usuarioVendedorId || 'No registrado' }}</p>
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Boletos</p>
            <p class="font-bold text-slate-900">{{ boletos.length }}</p>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Comprobante</p>
            <p class="mt-0.5 text-xs text-slate-500">
              Verifica el pago antes de aprobar o rechazar la venta.
            </p>
          </div>

          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-bold"
            :class="
              comprobanteDisponible
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            "
          >
            {{ comprobanteDisponible ? 'Comprobante adjunto' : 'Sin comprobante' }}
          </span>
        </div>

        <div class="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs">
          <template v-if="comprobanteUrl">
            <p class="break-all font-mono text-[11px] text-slate-500">{{ comprobanteUrl }}</p>
            <p v-if="esStripe" class="mt-2 font-semibold text-slate-600">
              Pago con tarjeta confirmado por Stripe.
            </p>
            <a
              v-else
              :href="comprobanteUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-2 inline-flex font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Abrir comprobante en una nueva pestaña
            </a>
          </template>
          <p v-else class="font-semibold text-red-600">
            Esta venta no tiene un comprobante asociado y no puede aprobarse.
          </p>
        </div>
      </section>

      <section class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="text-sm font-bold text-slate-900">Boletos de la venta</h4>
          <ButtonBase variant="outline" size="sm" @click="mostrarComprobantes = true">
            <span aria-hidden="true">🎫</span>
            Ver comprobantes
          </ButtonBase>
        </div>

        <div
          v-if="!boletos.length"
          class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-sm text-slate-500"
        >
          No se encontraron boletos asociados a esta venta.
        </div>

        <div v-else class="overflow-x-auto rounded-2xl border border-slate-200">
          <table class="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead class="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th class="px-4 py-3 font-bold">Asiento</th>
                <th class="px-4 py-3 font-bold">Pasajero</th>
                <th class="px-4 py-3 font-bold">Cédula</th>
                <th class="px-4 py-3 font-bold">Tipo</th>
                <th class="px-4 py-3 text-right font-bold">Tarifa</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              <tr v-for="boleto in boletos" :key="boleto.id ?? boleto.asientoId">
                <td class="px-4 py-3 font-black text-slate-900">#{{ boleto.asientoId }}</td>
                <td class="px-4 py-3 font-semibold text-slate-700">
                  {{ boleto.nombresPasajero }} {{ boleto.apellidosPasajero }}
                </td>
                <td class="px-4 py-3 text-slate-500">{{ boleto.cedulaPasajero }}</td>
                <td class="px-4 py-3 text-slate-500">{{ boleto.tipoPasajero }}</td>
                <td class="px-4 py-3 text-right font-bold text-slate-900">
                  ${{ formatearPrecio(boleto.precioFinal) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="rounded-2xl border border-red-100 bg-red-50/60 p-4">
        <label class="block text-xs font-bold uppercase tracking-wider text-red-700" :for="idObservacion">
          Observación de rechazo
        </label>
        <textarea
          :id="idObservacion"
          v-model="observacion"
          rows="3"
          class="mt-2 w-full rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
          placeholder="Indica el motivo si el comprobante no es válido (opcional)."
        />
      </section>
    </div>

    <template #footer="{ close }">
      <ButtonBase variant="outline" size="sm" :disabled="loading" @click="close">
        Cerrar
      </ButtonBase>
      <ButtonBase
        variant="danger"
        size="sm"
        :loading="loading"
        :disabled="!venta || !puedeResolver"
        @click="rechazar"
      >
        Rechazar pago
      </ButtonBase>
      <ButtonBase
        variant="success"
        size="sm"
        :loading="loading"
        :disabled="!puedeAprobar"
        @click="emit('approve')"
      >
        Aprobar pago
      </ButtonBase>
    </template>

    <ComprobanteBoletoModal
      v-model="mostrarComprobantes"
      :boletos="boletos"
      :venta="venta"
    />
  </ModalBase>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ModalBase from './ModalBase.vue'
import ButtonBase from './ButtonBase.vue'
import ComprobanteBoletoModal from './ComprobanteBoletoModal.vue'
import type { Boleto } from '../../Domain/Entities/Boleto'
import type { Venta } from '../../Domain/Entities/Venta'

interface Props {
  modelValue: boolean
  venta?: Venta | null
  boletos?: Boleto[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  venta: null,
  boletos: () => [],
  loading: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'approve'): void
  (e: 'reject', observacion: string): void
}>()

const idObservacion = `observacion-rechazo-${Math.random().toString(36).slice(2, 8)}`
const observacion = ref('')
const mostrarComprobantes = ref(false)

const comprobanteUrl = computed(() => props.venta?.comprobanteUrl ?? '')
const comprobanteDisponible = computed(() => Boolean(comprobanteUrl.value.trim()))
const esStripe = computed(() => comprobanteUrl.value.startsWith('STRIPE_ID:'))
const puedeResolver = computed(
  () => Boolean(props.venta) && !props.loading,
)
const puedeAprobar = computed(
  () =>
    puedeResolver.value &&
    comprobanteDisponible.value &&
    props.boletos.length > 0,
)

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) {
      observacion.value = ''
      mostrarComprobantes.value = false
    }
  },
)

watch(
  () => props.venta?.id,
  () => {
    observacion.value = ''
  },
)

function rechazar(): void {
  emit('reject', observacion.value.trim())
}

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
</script>
