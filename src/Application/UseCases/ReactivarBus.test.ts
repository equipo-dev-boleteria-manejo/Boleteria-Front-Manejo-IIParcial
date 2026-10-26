import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReactivarBus } from './ReactivarBus';
import type { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import { Bus } from '../../Domain/Entities/Bus';
import { EstadoBus } from '../../Domain/Constants/EstadosSistema';
import { BusNoEncontradoException } from '../../Domain/Exceptions/BusException';
import { BusNoDisponibleParaReactivarException } from '../../Domain/Exceptions/BusFueraDeServicioException';

describe('ReactivarBus', () => {
  let mockBusRepo: IBusRepository;
  let useCase: ReactivarBus;

  function crearBusConEstado(estado: EstadoBus): Bus {
    const bus = new Bus(1, '25', 'PBA-1234', 40, estado);
    bus.id = 5;
    return bus;
  }

  beforeEach(() => {
    mockBusRepo = {
      obtenerTodos: vi.fn().mockResolvedValue([]),
      obtenerPorCooperativa: vi.fn().mockResolvedValue([]),
      obtenerDisponiblesParaOperar: vi.fn().mockResolvedValue([]),
      obtenerPorId: vi.fn().mockResolvedValue(crearBusConEstado(EstadoBus.MANTENIMIENTO)),
      obtenerPorPlaca: vi.fn().mockResolvedValue(null),
      obtenerPorNumero: vi.fn().mockResolvedValue(null),
      crear: vi.fn(),
      actualizar: vi.fn(),
      cambiarEstado: vi.fn().mockResolvedValue(crearBusConEstado(EstadoBus.ACTIVO)),
      eliminarLogico: vi.fn().mockResolvedValue(undefined),
    };

    useCase = new ReactivarBus(mockBusRepo);
  });

  it('debe reactivar un bus en Mantenimiento cambiando su estado a Activo', async () => {
    const resultado = await useCase.ejecutar({ busId: 5, reactivadoPor: 'admin-1' });

    expect(resultado.success).toBe(true);
    expect(resultado.busReactivado.id).toBe(5);
    expect(resultado.busReactivado.numero).toBe('25');
    expect(resultado.busReactivado.estado).toBe(EstadoBus.ACTIVO);
    expect(resultado.mensaje).toContain('Bus 25');
    expect(mockBusRepo.cambiarEstado).toHaveBeenCalledTimes(1);
    expect(mockBusRepo.cambiarEstado).toHaveBeenCalledWith(5, EstadoBus.ACTIVO);
  });

  it('debe usar el busId recibido si el repositorio devuelve el bus sin id', async () => {
    const busSinId = new Bus(1, '25', 'PBA-1234', 40, EstadoBus.ACTIVO);
    mockBusRepo.cambiarEstado = vi.fn().mockResolvedValue(busSinId);

    const resultado = await useCase.ejecutar({ busId: 5, reactivadoPor: 'admin-1' });

    expect(resultado.busReactivado.id).toBe(5);
  });

  it('debe lanzar BusNoEncontradoException si el bus no existe', async () => {
    mockBusRepo.obtenerPorId = vi.fn().mockResolvedValue(null);

    await expect(
      useCase.ejecutar({ busId: 99, reactivadoPor: 'admin-1' })
    ).rejects.toThrow(BusNoEncontradoException);

    expect(mockBusRepo.cambiarEstado).not.toHaveBeenCalled();
  });

  it.each([EstadoBus.ACTIVO, EstadoBus.INACTIVO, EstadoBus.FUERA_DE_SERVICIO])(
    'debe lanzar BusNoDisponibleParaReactivarException si el bus está en estado %s',
    async (estado) => {
      mockBusRepo.obtenerPorId = vi.fn().mockResolvedValue(crearBusConEstado(estado));

      await expect(
        useCase.ejecutar({ busId: 5, reactivadoPor: 'admin-1' })
      ).rejects.toThrow(BusNoDisponibleParaReactivarException);

      expect(mockBusRepo.cambiarEstado).not.toHaveBeenCalled();
    }
  );
});