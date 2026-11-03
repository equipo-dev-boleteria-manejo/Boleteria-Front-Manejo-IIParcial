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
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  loadStripe,
  type Stripe,
  type StripeCardElement,
  type StripeElements,
} from '@stripe/stripe-js'
import { PrepararPagoStripe } from '../../Application/UseCases/PrepararPagoStripe'
import { SupabasePaymentRepository } from '../../Infrastructure/Repositories/SupabasePaymentRepository'

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
const listo = ref(false)
const cargando = ref(false)
const error = ref<string | null>(null)
const configError = ref<string>('')

const llavePublica = String(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '').trim()
const prepararPago = new PrepararPagoStripe(new SupabasePaymentRepository())

let stripe: Stripe | null = null
let elements: StripeElements | null = null
let tarjeta: StripeCardElement | null = null
let inicializacion: Promise<void> | null = null
let intencionActual: { amount: number; clientSecret: string } | null = null

function reportarError(mensaje: string): void {
  error.value = mensaje
  emit('error', mensaje)
}

async function inicializar(): Promise<void> {
  if (listo.value) return
  if (inicializacion) return inicializacion

  if (!llavePublica) {
    configError.value =
      'Stripe no está configurado. Agrega VITE_STRIPE_PUBLISHABLE_KEY en el archivo .env para habilitar los pagos con tarjeta.'
    emit('error', configError.value)
    return
  }

  inicializacion = (async () => {
    try {
      stripe = await loadStripe(llavePublica)

      if (!stripe) {
        throw new Error('No se pudo cargar Stripe.js. Revisa tu conexión e inténtalo de nuevo.')
      }

      elements = stripe.elements({ locale: 'es' })
      tarjeta = elements.create('card', {
        hidePostalCode: true,
        style: {
          base: {
            color: '#0f172a',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontSize: '14px',
            '::placeholder': { color: '#94a3b8' },
          },
          invalid: { color: '#dc2626' },
        },
      })

      tarjeta.on('change', (evento) => {
        error.value = evento.error?.message ?? null
      })

      await nextTick()

      if (!contenedorTarjeta.value) {
        throw new Error('No se pudo preparar el formulario de pago con tarjeta.')
      }

      tarjeta.mount(contenedorTarjeta.value)
      listo.value = true
      error.value = null
      emit('ready')
    } catch (err: any) {
      reportarError(
        err?.message || 'No se pudo inicializar el formulario de pago con tarjeta.',
      )
      throw err
    } finally {
      inicializacion = null
    }
  })()

  return inicializacion
}

async function pagar(): Promise<string> {
  if (configError.value) {
    reportarError(configError.value)
    throw new Error(configError.value)
  }

  if (!Number.isFinite(props.amount) || props.amount <= 0) {
    const mensaje = 'El total de la compra no es válido para procesar el pago.'
    reportarError(mensaje)
    throw new Error(mensaje)
  }

  cargando.value = true
  error.value = null

  try {
    await inicializar()

    if (!stripe || !tarjeta) {
      throw new Error('El formulario de pago con tarjeta todavía no está disponible.')
    }

    if (!intencionActual || intencionActual.amount !== props.amount) {
      const { clientSecret } = await prepararPago.ejecutar(
        props.amount,
        props.currency,
      )
      intencionActual = { amount: props.amount, clientSecret }
    }

    const resultado = await stripe.confirmCardPayment(
      intencionActual.clientSecret,
      {
        payment_method: { card: tarjeta },
      },
    )

    if (resultado.error) {
      throw new Error(
        resultado.error.message || 'Stripe rechazó el pago con la tarjeta.',
      )
    }

    const pago = resultado.paymentIntent
    if (!pago?.id) {
      throw new Error('Stripe no confirmó el pago. Inténtalo nuevamente.')
    }

    if (!['succeeded', 'processing', 'requires_capture'].includes(pago.status)) {
      throw new Error(
        `El pago quedó en estado "${pago.status}". No se pudo completar la compra.`,
      )
    }

    return pago.id
  } catch (err: any) {
    reportarError(err?.message || 'No se pudo procesar el pago con tarjeta.')
    throw err
  } finally {
    cargando.value = false
  }
}

function reiniciar(): void {
  intencionActual = null
  error.value = null
  tarjeta?.clear()
}

onMounted(() => {
  void inicializar().catch(() => {
    /* El error ya se muestra en el formulario. */
  })
})

onBeforeUnmount(() => {
  tarjeta?.destroy()
  tarjeta = null
  elements = null
  stripe = null
  listo.value = false
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
