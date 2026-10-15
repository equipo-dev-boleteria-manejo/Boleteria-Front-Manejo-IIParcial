export interface IPaymentRepository {
  createPaymentIntent(amount: number, currency: string): Promise<{ clientSecret: string }>;
}
