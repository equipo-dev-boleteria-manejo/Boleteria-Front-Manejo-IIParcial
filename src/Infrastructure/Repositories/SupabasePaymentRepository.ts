/**
 * SupabasePaymentRepository.ts - Implementación de IPaymentRepository
 *
 * Los montos nunca se confirman desde el navegador: el PaymentIntent se crea
 * en una Edge Function de Supabase que mantiene la llave secreta de Stripe.
 */

import { supabase } from '../Api/supabaseClient';
import type { IPaymentRepository } from '../../Domain/Repositories/IPaymentRepository';
import { DomainException } from '../../Domain/Exceptions/DomainException';

interface PaymentIntentResponse {
  clientSecret?: string;
  client_secret?: string;
}

export class SupabasePaymentRepository implements IPaymentRepository {
  private readonly FUNCION_PAGO = 'create-payment-intent';

  async createPaymentIntent(
    amount: number,
    currency: string,
  ): Promise<{ clientSecret: string }> {
    const { data, error } = await supabase.functions.invoke<PaymentIntentResponse>(
      this.FUNCION_PAGO,
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

    return { clientSecret };
  }
}
