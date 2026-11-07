<template>
  <div class="space-y-3">
    <div
      v-if="configError"
      class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-semibold text-amber-800"
    >
      <span aria-hidden="true">⚠️</span>
      <span>{{ configError }}</span>
    </div>

    <template v-else>
      <div class="rounded-xl border border-slate-300 bg-white px-3.5 py-3.5">
        <div
          ref="contenedorTarjeta"
          class="min-h-[42px] transition-opacity"
          :class="listo ? 'opacity-100' : 'opacity-40'"
        />
        <p v-if="!listo && !error" class="mt-2 text-[11px] text-slate-400">
          Cargando formulario seguro de Stripe…
        </p>
      </div>

      <p class="flex items-center gap-1.5 text-[11px] text-slate-500">
        <span aria-hidden="true">🔒</span>
        Pago procesado por Stripe. Los datos de la tarjeta no pasan por nuestros servidores.
      </p>
    </template>

    <p
      v-if="error"
      class="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
    >
      <span aria-hidden="true">⚠️</span>
      <span>{{ error }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePagoStripe } from '../Composables/usePagoStripe'

interface Props {
  amount: number
  currency?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currency: 'usd',
  disabled: false,
})

const emit = defineEmits<{
  (e: 'ready'): void
  (e: 'error', message: string): void
}>()

const contenedorTarjeta = ref<HTMLDivElement | null>(null)
const {
  listo,
  cargando,
  error,
  configError,
  montar,
  pagar: cobrar,
  reiniciar: reiniciarPago,
  desmontar,
} = usePagoStripe()

watch(error, (mensaje) => {
  if (mensaje) emit('error', mensaje)
})

watch(listo, (estaListo) => {
  if (estaListo) emit('ready')
})

async function inicializar(): Promise<void> {
  await nextTick()
  await montar(contenedorTarjeta.value)
}

async function pagar(monto?: number): Promise<string> {
  const total = Number.isFinite(monto) && (monto ?? 0) > 0 ? monto! : props.amount
  return cobrar(total, props.currency)
}

function reiniciar(): void {
  reiniciarPago()
}

onMounted(() => {
  void inicializar().catch(() => {
    /* El error ya se muestra en el formulario. */
  })
})

onBeforeUnmount(() => {
  desmontar()
})

defineExpose({
  pagar,
  reiniciar,
  listo,
  cargando,
  configError,
  error,
})
</script>
