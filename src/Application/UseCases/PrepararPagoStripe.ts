import type { IPaymentRepository } from '../../Domain/Repositories/IPaymentRepository';
import { DomainException } from '../../Domain/Exceptions/DomainException';

export class PrepararPagoStripe {
  constructor(private paymentRepo: IPaymentRepository) {}

  async ejecutar(amount: number, currency: string = 'usd'): Promise<{ clientSecret: string }> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new DomainException('El monto para el pago debe ser mayor a 0.', 'MONTO_INVALIDO');
    }

    // El monto debe enviarse en centavos a la API de Stripe
    const amountInCents = Math.round(amount * 100);
    return await this.paymentRepo.createPaymentIntent(amountInCents, currency.toLowerCase());
  }
}
