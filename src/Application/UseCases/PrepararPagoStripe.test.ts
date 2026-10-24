import { describe, it, expect, vi } from 'vitest';
import { PrepararPagoStripe } from './PrepararPagoStripe';
import type { IPaymentRepository } from '../../Domain/Repositories/IPaymentRepository';

describe('PrepararPagoStripe (Caso de Uso)', () => {
  it('debe convertir el monto en dólares a centavos y llamar al repositorio de pago', async () => {
    const mockPaymentRepo: IPaymentRepository = {
      createPaymentIntent: vi.fn().mockResolvedValue({ clientSecret: 'sec_test_12345' }),
    };

    const useCase = new PrepararPagoStripe(mockPaymentRepo);
    const result = await useCase.ejecutar(15.5, 'usd');

    expect(mockPaymentRepo.createPaymentIntent).toHaveBeenCalledWith(1550, 'usd');
    expect(result.clientSecret).toBe('sec_test_12345');
  });

  it('debe lanzar DomainException si el monto es menor o igual a cero', async () => {
    const mockPaymentRepo: IPaymentRepository = {
      createPaymentIntent: vi.fn(),
    };

    const useCase = new PrepararPagoStripe(mockPaymentRepo);
    await expect(useCase.ejecutar(0)).rejects.toThrow('El monto para el pago debe ser mayor a 0');
    await expect(useCase.ejecutar(-10)).rejects.toThrow('El monto para el pago debe ser mayor a 0');
  });
});
