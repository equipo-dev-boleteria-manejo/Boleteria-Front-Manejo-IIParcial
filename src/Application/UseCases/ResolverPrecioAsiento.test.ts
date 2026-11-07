import { describe, expect, it, vi } from 'vitest';
import { ResolverPrecioAsiento } from './ResolverPrecioAsiento';
import { Asiento } from '../../Domain/Entities/Asiento';
import { SeatType } from '../../Domain/Entities/SeatType';
import type { IAsientoRepository } from '../../Domain/Repositories/IAsientoRepository';
import type { ISeatTypeRepository } from '../../Domain/Repositories/ISeatTypeRepository';

function crearRepos() {
  const asientos = new Map<number, Asiento>();
  const normal = new Asiento(1, '1', 'Normal');
  normal.id = 5;
  const vip = new Asiento(1, '2', 'VIP');
  vip.id = 6;
  asientos.set(5, normal);
  asientos.set(6, vip);

  const asientoRepo = {
    obtenerPorId: vi.fn((id: number) =>
      Promise.resolve(asientos.get(id) ?? null),
    ),
  } as unknown as IAsientoRepository;

  const seatTypeRepo = {
    obtenerTodos: vi
      .fn()
      .mockResolvedValue([
        new SeatType('Normal', '#3498db', 10),
        new SeatType('VIP', '#e74c3c', 15),
      ]),
  } as unknown as ISeatTypeRepository;

  return { asientoRepo, seatTypeRepo };
}

describe('ResolverPrecioAsiento', () => {
  it('resuelve la tarifa oficial de cada asiento desde SeatTypes', async () => {
    const { asientoRepo, seatTypeRepo } = crearRepos();
    const resolver = new ResolverPrecioAsiento(asientoRepo, seatTypeRepo);

    const precios = await resolver.ejecutar([5, 6, 5]);

    expect(precios.get(5)).toBe(10);
    expect(precios.get(6)).toBe(15);
    expect(precios.size).toBe(2);
  });

  it('rechaza asientos inexistentes', async () => {
    const { asientoRepo, seatTypeRepo } = crearRepos();
    const resolver = new ResolverPrecioAsiento(asientoRepo, seatTypeRepo);

    await expect(resolver.ejecutar([99])).rejects.toThrow('no existe');
  });

  it('rechaza tipos de asiento sin tarifa configurada', async () => {
    const { asientoRepo, seatTypeRepo } = crearRepos();
    vi.mocked(seatTypeRepo.obtenerTodos).mockResolvedValue([
      new SeatType('Normal', '#3498db', 10),
    ]);
    const resolver = new ResolverPrecioAsiento(asientoRepo, seatTypeRepo);

    await expect(resolver.ejecutar([6])).rejects.toThrow(
      'No existe una tarifa configurada',
    );
  });

  it('rechaza una lista vacía de asientos', async () => {
    const { asientoRepo, seatTypeRepo } = crearRepos();
    const resolver = new ResolverPrecioAsiento(asientoRepo, seatTypeRepo);

    await expect(resolver.ejecutar([])).rejects.toThrow('al menos un asiento');
  });
});
