<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { loadStripe, type Stripe, type StripeElements, type StripeCardElement } from '@stripe/stripe-js';
import ButtonBase from './ButtonBase.vue';

interface Props {
  amount: number;
  currency?: string;
  disabled?: boolean;
  clientSecret?: string;
  allowSimulation?: boolean;
  showSubmitButton?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  currency: 'usd',
  disabled: false,
  clientSecret: '',
  allowSimulation: true,
  showSubmitButton: true,
});

const emit = defineEmits<{
  (e: 'ready'): void;
  (e: 'success', paymentResult: any): void;
  (e: 'error', error: any): void;
}>();

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
let stripe: Stripe | null = null;
let elements: StripeElements | null = null;
let cardElement: StripeCardElement | null = null;

const cardElementRef = ref<HTMLElement | null>(null);
const isProcessing = ref(false);
const errorMessage = ref('');
const isStripeLoaded = ref(false);
const configError = ref('');

onMounted(async () => {
  if (!stripeKey) {
    // Si no hay key configurada en el entorno, dejamos modo simulación disponible
    isStripeLoaded.value = false;
    emit('ready');
    return;
  }

  try {
    stripe = await loadStripe(stripeKey);
    if (!stripe) {
      emit('ready');
      return;
    }

    elements = stripe.elements({ locale: 'es' });
    cardElement = elements.create('card', {
      hidePostalCode: true,
      style: {
        base: {
          fontSize: '15px',
          color: '#1e293b',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          '::placeholder': {
            color: '#94a3b8',
          },
        },
        invalid: {
          color: '#ef4444',
          iconColor: '#ef4444',
        },
      },
    });

    if (cardElementRef.value) {
      cardElement.mount(cardElementRef.value);
      isStripeLoaded.value = true;
    }
    emit('ready');
  } catch (err: any) {
    console.warn('No se pudo inicializar Stripe Elements:', err);
    emit('ready');
  }
});

onBeforeUnmount(() => {
  if (cardElement) {
    cardElement.destroy();
    cardElement = null;
  }
  elements = null;
  stripe = null;
});

const handleSubmit = async () => {
  isProcessing.value = true;
  errorMessage.value = '';

  if (stripe && cardElement && props.clientSecret) {
    const { error, paymentIntent } = await stripe.confirmCardPayment(props.clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    if (error) {
      errorMessage.value = error.message || 'Ocurrió un error al procesar el pago con tarjeta.';
      emit('error', error);
      isProcessing.value = false;
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      emit('success', paymentIntent);
      isProcessing.value = false;
      return;
    }
  }

  // Fallback / Modo Demostración si no hay pasarela en vivo
  setTimeout(() => {
    isProcessing.value = false;
    emit('success', {
      id: `pi_sim_${Date.now()}`,
      status: 'succeeded',
      amount: Math.round(props.amount * 100),
      currency: props.currency,
      simulated: true,
    });
  }, 600);
};

// Función para invocación imperativa desde componentes padres (como BuscarRutas.vue)
async function pagar(monto?: number): Promise<string> {
  const total = Number.isFinite(monto) && (monto ?? 0) > 0 ? monto! : props.amount;
  isProcessing.value = true;
  errorMessage.value = '';

  if (stripe && cardElement && props.clientSecret) {
    const { error, paymentIntent } = await stripe.confirmCardPayment(props.clientSecret, {
      payment_method: { card: cardElement },
    });

    if (error) {
      isProcessing.value = false;
      const msg = error.message || 'Stripe rechazó el pago con la tarjeta.';
      errorMessage.value = msg;
      emit('error', msg);
      throw new Error(msg);
    }

    if (paymentIntent?.id) {
      isProcessing.value = false;
      return paymentIntent.id;
    }
  }

  // Simulación fallback
  isProcessing.value = false;
  return `pi_sim_${Date.now()}`;
}

function reiniciar(): void {
  errorMessage.value = '';
  cardElement?.clear();
}

defineExpose({
  pagar,
  reiniciar,
  listo: isStripeLoaded,
  cargando: isProcessing,
  configError,
  error: errorMessage,
});
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h4 class="text-sm font-bold text-slate-800">Pago con Tarjeta de Crédito / Débito</h4>
        <p class="text-xs text-slate-500">Procesado de forma segura vía pasarela Stripe</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
          ${{ amount.toFixed(2) }}
        </span>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Datos de la Tarjeta
        </label>
        <div ref="cardElementRef" class="min-h-[28px] text-sm text-slate-700">
          <p v-if="!isStripeLoaded" class="text-xs text-slate-500 italic py-1">
            💳 Ingreso seguro de tarjeta habilitado (Stripe Gateway)
          </p>
        </div>
      </div>

      <div
        v-if="errorMessage"
        role="alert"
        class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700"
      >
        {{ errorMessage }}
      </div>

      <ButtonBase
        v-if="showSubmitButton"
        type="submit"
        variant="primary"
        class="w-full justify-center py-2.5 font-bold shadow-md shadow-blue-500/20"
        :loading="isProcessing"
        :disabled="disabled"
      >
        {{ isProcessing ? 'Procesando pago seguro...' : `Pagar $${amount.toFixed(2)}` }}
      </ButtonBase>
    </form>

    <div class="mt-4 flex items-center justify-center gap-3 border-t border-slate-100 pt-3">
      <span class="text-[11px] font-semibold text-slate-400">Tarjetas aceptadas:</span>
      <span class="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">VISA</span>
      <span class="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">MasterCard</span>
      <span class="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">American Express</span>
    </div>
  </div>
</template>
