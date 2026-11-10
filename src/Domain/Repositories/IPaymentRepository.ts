/**
 * IPaymentRepository.ts - Contrato de pagos con Stripe.
 *
 * Todas las operaciones sensibles (crear, verificar, cancelar/reembolsar) se
 * ejecutan en Edge Functions; el navegador nunca maneja la llave secreta.
 */

export interface EstadoPagoStripe {
  /** Identificador del PaymentIntent (`pi_...`). */
  id: string;
  /** Estado informado por Stripe (`succeeded`, `processing`, etc.). */
  status: string;
  /** Monto cobrado en centavos. */
  amount: number;
  /** Moneda ISO en minúsculas (`usd`). */
  currency: string;
}

export interface IPaymentRepository {
  createPaymentIntent(
    amount: number,
    currency: string,
  ): Promise<{ clientSecret: string; paymentIntentId?: string }>;

  /**
   * Consulta el estado real del pago en Stripe. Se usa antes de emitir los
   * boletos para no confiar en el identificador enviado por el cliente.
   */
  verificarPago(paymentIntentId: string): Promise<EstadoPagoStripe>;

  /**
   * Cancela el PaymentIntent si aún no se cobró o solicita un reembolso total
   * cuando el cobro ya se completó. Se usa al revertir una compra.
   */
  cancelarPago(paymentIntentId: string): Promise<void>;
}
