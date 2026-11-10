/**
 * usePagoStripe.ts - Composable para inicializar y cobrar con Stripe.
 *
 * Mantiene toda la integración con Stripe.js y con el caso de uso de
 * preparación de pago fuera de los componentes de presentación. El componente
 * solo monta el contenedor de la tarjeta y llama a `pagar`.
 */

import { ref } from 'vue';
import {
  loadStripe,
  type Stripe,
  type StripeCardElement,
  type StripeElements,
} from '@stripe/stripe-js';
import { PrepararPagoStripe } from '../../Application/UseCases/PrepararPagoStripe';
import { SupabasePaymentRepository } from '../../Infrastructure/Repositories/SupabasePaymentRepository';

export type CargarStripe = typeof loadStripe;

interface IntencionPago {
  amount: number;
  currency: string;
  clientSecret: string;
}

const ESTADOS_PAGO_VALIDOS = ['succeeded', 'processing', 'requires_capture'];

function obtenerMensajeError(error: unknown, respaldo: string): string {
  return error instanceof Error && error.message ? error.message : respaldo;
}

export function usePagoStripe(
  prepararPago: PrepararPagoStripe = new PrepararPagoStripe(
    new SupabasePaymentRepository(),
  ),
  cargarStripe: CargarStripe = loadStripe,
  llavePublica: string = String(
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '',
  ).trim(),
) {
  const listo = ref(false);
  const cargando = ref(false);
  const error = ref<string | null>(null);
  const configError = ref('');

  let stripe: Stripe | null = null;
  let elements: StripeElements | null = null;
  let tarjeta: StripeCardElement | null = null;
  let inicializacion: Promise<void> | null = null;
  let intencionActual: IntencionPago | null = null;

  function reportarError(mensaje: string): void {
    error.value = mensaje;
  }

  async function montar(contenedor: HTMLElement | null): Promise<void> {
    if (listo.value) return;
    if (inicializacion) return inicializacion;

    if (!llavePublica) {
      configError.value =
        'Stripe no está configurado. Agrega VITE_STRIPE_PUBLISHABLE_KEY en el archivo .env para habilitar los pagos con tarjeta.';
      reportarError(configError.value);
      return;
    }

    if (!contenedor) {
      reportarError(
        'No se pudo preparar el formulario de pago con tarjeta.',
      );
      return;
    }

    inicializacion = (async () => {
      try {
        stripe = await cargarStripe(llavePublica);

        if (!stripe) {
          throw new Error(
            'No se pudo cargar Stripe.js. Revisa tu conexión e inténtalo de nuevo.',
          );
        }

        elements = stripe.elements({ locale: 'es' });
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
        });

        tarjeta.on('change', (evento) => {
          error.value = evento.error?.message ?? null;
        });

        tarjeta.mount(contenedor);
        listo.value = true;
        error.value = null;
      } catch (err: unknown) {
        reportarError(
          obtenerMensajeError(
            err,
            'No se pudo inicializar el formulario de pago con tarjeta.',
          ),
        );
        throw err;
      } finally {
        inicializacion = null;
      }
    })();

    return inicializacion;
  }

  async function pagar(
    amount: number,
    currency: string = 'usd',
  ): Promise<string> {
    if (configError.value) {
      reportarError(configError.value);
      throw new Error(configError.value);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      const mensaje = 'El total de la compra no es válido para procesar el pago.';
      reportarError(mensaje);
      throw new Error(mensaje);
    }

    cargando.value = true;
    error.value = null;

    try {
      if (!listo.value) {
        throw new Error(
          'El formulario de pago con tarjeta todavía no está disponible.',
        );
      }
      if (!stripe || !tarjeta) {
        throw new Error(
          'El formulario de pago con tarjeta todavía no está disponible.',
        );
      }

      if (
        !intencionActual ||
        intencionActual.amount !== amount ||
        intencionActual.currency !== currency
      ) {
        const { clientSecret } = await prepararPago.ejecutar(amount, currency);
        intencionActual = { amount, currency, clientSecret };
      }

      const resultado = await stripe.confirmCardPayment(
        intencionActual.clientSecret,
        {
          payment_method: { card: tarjeta },
        },
      );

      if (resultado.error) {
        throw new Error(
          resultado.error.message || 'Stripe rechazó el pago con la tarjeta.',
        );
      }

      const pago = resultado.paymentIntent;
      if (!pago?.id) {
        throw new Error('Stripe no confirmó el pago. Inténtalo nuevamente.');
      }

      if (!ESTADOS_PAGO_VALIDOS.includes(pago.status)) {
        throw new Error(
          `El pago quedó en estado "${pago.status}". No se pudo completar la compra.`,
        );
      }

      // El PaymentIntent ya se consumió: si la confirmación posterior falla y
      // se reembolsa, el siguiente intento debe crear uno nuevo.
      intencionActual = null;

      return pago.id;
    } catch (err: unknown) {
      reportarError(
        obtenerMensajeError(err, 'No se pudo procesar el pago con tarjeta.'),
      );
      throw err;
    } finally {
      cargando.value = false;
    }
  }

  function reiniciar(): void {
    intencionActual = null;
    error.value = null;
    tarjeta?.clear();
  }

  function desmontar(): void {
    tarjeta?.destroy();
    tarjeta = null;
    elements = null;
    stripe = null;
    listo.value = false;
  }

  return {
    listo,
    cargando,
    error,
    configError,
    montar,
    pagar,
    reiniciar,
    desmontar,
  };
}
