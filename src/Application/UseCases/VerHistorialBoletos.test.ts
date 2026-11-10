import { describe, it, expect, vi } from 'vitest';
import { VerHistorialBoletos } from './VerHistorialBoletos';
import type { ITicketRepository } from '../../Domain/Repositories/ITicketRepository';
import { Boleto } from '../../Domain/Entities/Boleto';

describe('VerHistorialBoletos (Caso de Uso)', () => {
  it('debe consultar el historial de boletos asociados a la cédula de un usuario', async () => {
    const boletoMock = new Boleto(1, 1, 1, '1710000009', 'Juan', 'Perez', 10);
    const mockTicketRepo: ITicketRepository = {
      obtenerBoletosPorUsuario: vi.fn().mockResolvedValue([boletoMock]),
    };

    const useCase = new VerHistorialBoletos(mockTicketRepo);
    const resultado = await useCase.ejecutar('1710000009');

    expect(mockTicketRepo.obtenerBoletosPorUsuario).toHaveBeenCalledWith('1710000009');
    expect(resultado).toHaveLength(1);
    expect(resultado[0].cedulaPasajero).toBe('1710000009');
  });

  it('debe rechazar si la cédula o identificador está vacío', async () => {
    const mockTicketRepo: ITicketRepository = {
      obtenerBoletosPorUsuario: vi.fn(),
    };

    const useCase = new VerHistorialBoletos(mockTicketRepo);
    await expect(useCase.ejecutar('')).rejects.toThrow('Identificador de usuario o cédula requerido');
  });
});
