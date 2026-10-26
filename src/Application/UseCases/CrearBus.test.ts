import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrearBus } from './CrearBus';
import type { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import { Bus } from '../../Domain/Entities/Bus';
import { EstadoBus } from '../../Domain/Constants/EstadosSistema';
import { DomainException } from '../../Domain/Exceptions/DomainException';

describe('CrearBus', () => {
  let mockBusRepo: IBusRepository;
  let useCase: CrearBus;

  const inputValido = {
    cooperativaId: 1,
    numero: '25',
    placa: 'PBA-1234',
    totalAsientos: 40,
  };

  beforeEach(() => {
    mockBusRepo = {
      obtenerTodos: vi.fn().mockResolvedValue([]),
      obtenerPorCooperativa: vi.fn().mockResolvedValue([]),
      obtenerDisponiblesParaOperar: vi.fn().mockResolvedValue([]),
      obtenerPorId: vi.fn().mockResolvedValue(null),
      obtenerPorPlaca: vi.fn().mockResolvedValue(null),
      obtenerPorNumero: vi.fn().mockResolvedValue(null),
      crear: vi.fn().mockImplementation(async (bus: Bus) => {
        bus.id = 10;
        return bus;
      }),
      actualizar: vi.fn(),
      cambiarEstado: vi.fn(),
      eliminarLogico: vi.fn().mockResolvedValue(undefined),
    };

    useCase = new CrearBus(mockBusRepo);
  });

  it('debe crear y persistir un bus válido con estado Activo y estructura UnPiso por defecto', async () => {
    const resultado = await useCase.ejecutar(inputValido);

    expect(resultado.id).toBe(10);
    expect(resultado.numero).toBe('25');
    expect(resultado.placa).toBe('PBA-1234');
    expect(resultado.estado).toBe(EstadoBus.ACTIVO);
    expect(resultado.estructura).toBe('UnPiso');
    expect(mockBusRepo.crear).toHaveBeenCalledTimes(1);
  });

  it('debe asignar la estructura y los datos opcionales cuando se proporcionan', async () => {
    const resultado = await useCase.ejecutar({
      ...inputValido,
      estructura: 'DosPisos',
      marcaChasis: 'Mercedes-Benz',
      marcaCarroceria: 'Busscar',
      anio: 2022,
      fotoUrl: 'https://ejemplo.com/bus.jpg',
    });

    expect(resultado.estructura).toBe('DosPisos');
    expect(resultado.marcaChasis).toBe('Mercedes-Benz');
    expect(resultado.marcaCarroceria).toBe('Busscar');
    expect(resultado.anio).toBe(2022);
    expect(resultado.fotoUrl).toBe('https://ejemplo.com/bus.jpg');
  });

  it('debe lanzar DomainException si la placa es demasiado corta y no consultar ni persistir', async () => {
    await expect(
      useCase.ejecutar({ ...inputValido, placa: 'AB1' })
    ).rejects.toThrow(DomainException);

    await expect(
      useCase.ejecutar({ ...inputValido, placa: 'AB1' })
    ).rejects.toThrow('no son válidos');

    expect(mockBusRepo.obtenerPorPlaca).not.toHaveBeenCalled();
    expect(mockBusRepo.crear).not.toHaveBeenCalled();
  });

  it('debe lanzar DomainException si la capacidad es cero', async () => {
    await expect(
      useCase.ejecutar({ ...inputValido, totalAsientos: 0 })
    ).rejects.toThrow(DomainException);

    expect(mockBusRepo.crear).not.toHaveBeenCalled();
  });

  it('debe lanzar DomainException si ya existe un bus con la misma placa', async () => {
    mockBusRepo.obtenerPorPlaca = vi
      .fn()
      .mockResolvedValue(new Bus(1, '10', 'PBA-1234', 40));

    await expect(useCase.ejecutar(inputValido)).rejects.toThrow(DomainException);

    await expect(useCase.ejecutar(inputValido)).rejects.toThrow(
      'Ya existe un autobús registrado con la placa PBA-1234'
    );

    expect(mockBusRepo.crear).not.toHaveBeenCalled();
  });
});