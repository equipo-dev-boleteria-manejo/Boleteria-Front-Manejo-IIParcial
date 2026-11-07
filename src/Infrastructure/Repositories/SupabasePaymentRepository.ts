/**
 * SupabasePaymentRepository.ts - Implementación de IPaymentRepository
 *
 * Los montos y estados nunca se confirman desde el navegador: cada operación
 * se delega a una Edge Function de Supabase que mantiene la llave secreta de
 * Stripe.
 */

import { supabase } from '../Api/supabaseClient';
import type {
  EstadoPagoStripe,
  IPaymentRepository,
} from '../../Domain/Repositories/IPaymentRepository';
import { DomainException } from '../../Domain/Exceptions/DomainException';

interface PaymentIntentResponse {
  clientSecret?: string;
  client_secret?: string;
  paymentIntentId?: string;
  id?: string;
}

interface VerifyPaymentResponse {
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
}

export class SupabasePaymentRepository implements IPaymentRepository {
  private readonly FUNCION_CREAR = 'create-payment-intent';
  private readonly FUNCION_VERIFICAR = 'verify-payment-intent';
  private readonly FUNCION_CANCELAR = 'cancel-payment-intent';

  async createPaymentIntent(
    amount: number,
    currency: string,
  ): Promise<{ clientSecret: string; paymentIntentId?: string }> {
    const { data, error } = await supabase.functions.invoke<PaymentIntentResponse>(
      this.FUNCION_CREAR,
      { body: { amount, currency } },
    );

    if (error) {
      throw new DomainException(
        `No se pudo iniciar el pago con Stripe: ${error.message}`,
        'STRIPE_INTENT_ERROR',
      );
    }

    const clientSecret = data?.clientSecret ?? data?.client_secret;
    if (!clientSecret) {
      throw new DomainException(
        'La función de pago no devolvió un clientSecret válido.',
        'STRIPE_CLIENT_SECRET_FALTANTE',
      );
    }

    return {
      clientSecret,
      paymentIntentId: data?.paymentIntentId ?? data?.id,
    };
  }

  async verificarPago(paymentIntentId: string): Promise<EstadoPagoStripe> {
    const { data, error } = await supabase.functions.invoke<VerifyPaymentResponse>(
      this.FUNCION_VERIFICAR,
      { body: { paymentIntentId } },
    );

    if (error) {
      throw new DomainException(
        `No se pudo verificar el pago con Stripe: ${error.message}`,
        'STRIPE_VERIFICACION_ERROR',
      );
    }

    if (!data?.id || !data.status) {
      throw new DomainException(
        'La función de verificación no devolvió un pago válido.',
        'STRIPE_VERIFICACION_INVALIDA',
      );
    }

    return {
      id: data.id,
      status: data.status,
      amount: Number(data.amount ?? 0),
      currency: String(data.currency ?? ''),
    };
  }

  async cancelarPago(paymentIntentId: string): Promise<void> {
    const { error } = await supabase.functions.invoke(
      this.FUNCION_CANCELAR,
      { body: { paymentIntentId } },
    );

    if (error) {
      throw new DomainException(
        `No se pudo cancelar o reembolsar el pago con Stripe: ${error.message}`,
        'STRIPE_CANCELACION_ERROR',
      );
    }
  }
}
