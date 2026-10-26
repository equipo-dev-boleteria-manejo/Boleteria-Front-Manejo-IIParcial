import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportarIncidenteOperativo } from './ReportarIncidenteOperativo';
import type { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import { Bus } from '../../Domain/Entities/Bus';
import { EstadoBus } from '../../Domain/Constants/EstadosSistema';
import { BusException, BusNoEncontradoException } from '../../Domain/Exceptions/BusException';
import { BusReemplazoNoValidoException } from '../../Domain/Exceptions/BusFueraDeServicioException';

describe('ReportarIncidenteOperativo', () => {
  let mockBusRepo: IBusRepository;
  let useCase: ReportarIncidenteOperativo;
  let busActual: Bus;
  let busReemplazo: Bus;

  const inputBase = {
    cooperativaId: 1,
    busNumero: '25',
    motivo: 'AveriaMecanica',
    descripcion: 'Falla en el motor',
  };

  beforeEach(() => {
    busActual = new Bus(1, '25', 'PBA-1234', 40, EstadoBus.ACTIVO);
    busActual.id = 5;

    busReemplazo = new Bus(1, '30', 'PBB-5678', 40, EstadoBus.ACTIVO);
    busReemplazo.id = 6;

    mockBusRepo = {
      obtenerTodos: vi.fn().mockResolvedValue([]),
      obtenerPorCooperativa: vi.fn().mockResolvedValue([]),
      obtenerDisponiblesParaOperar: vi.fn().mockResolvedValue([]),
      obtenerPorId: vi.fn().mockResolvedValue(null),
      obtenerPorPlaca: vi.fn().mockResolvedValue(null),
      obtenerPorNumero: vi.fn().mockImplementation(async (_coopId: number, numero: string) => {
        if (numero === '25') return busActual;
        if (numero === '30') return busReemplazo;
        return null;
      }),
      crear: vi.fn(),
      actualizar: vi.fn(),
      cambiarEstado: vi.fn().mockImplementation(async (id: number, estado: EstadoBus) => {
        const bus = new Bus(1, '25', 'PBA-1234', 40, estado);
        bus.id = id;
        return bus;
      }),
      eliminarLogico: vi.fn().mockResolvedValue(undefined),
    };

    useCase = new ReportarIncidenteOperativo(mockBusRepo);
  });

  it('debe sacar el bus de operación y devolver los datos del incidente', async () => {
    const resultado = await useCase.ejecutar(inputBase);

    expect(resultado.success).toBe(true);
    expect(resultado.incidenteId).toMatch(/^INC-5-/);
    expect(resultado.busActualizado.id).toBe(5);
    expect(resultado.busActualizado.estado).toBe(EstadoBus.MANTENIMIENTO);
    expect(resultado.motivo).toBe('AveriaMecanica');
    expect(resultado.descripcion).toBe('Falla en el motor');
    expect(resultado.acciones.reemplazoPosible).toBe(false);
    expect(resultado.acciones.busReemplazoSugerido).toBeUndefined();
    expect(resultado.acciones.mensaje).toContain('Bus 25');
    expect(mockBusRepo.cambiarEstado).toHaveBeenCalledWith(5, EstadoBus.MANTENIMIENTO);
  });

  it('debe sugerir el bus de reemplazo disponible sin cambiar su estado', async () => {
    const resultado = await useCase.ejecutar({ ...inputBase, replacementBusNumero: '30' });

    expect(resultado.acciones.reemplazoPosible).toBe(true);
    expect(resultado.acciones.busReemplazoSugerido).toEqual({ id: 6, numero: '30' });
    expect(resultado.acciones.mensaje).toContain('reemplazo sugerido: 30');
    expect(mockBusRepo.cambiarEstado).toHaveBeenCalledTimes(1);
    expect(mockBusRepo.cambiarEstado).toHaveBeenCalledWith(5, EstadoBus.MANTENIMIENTO);
  });

  it('debe lanzar BusNoEncontradoException si el bus no existe', async () => {
    await expect(
      useCase.ejecutar({ ...inputBase, busNumero: '99' })
    ).rejects.toThrow(BusNoEncontradoException);

    expect(mockBusRepo.cambiarEstado).not.toHaveBeenCalled();
  });

  it('debe lanzar BusException si el motivo no es válido', async () => {
    await expect(
      useCase.ejecutar({ ...inputBase, motivo: 'MotivoInventado' })
    ).rejects.toThrow(BusException);

    await expect(
      useCase.ejecutar({ ...inputBase, motivo: 'MotivoInventado' })
    ).rejects.toThrow('Motivo inválido');

    expect(mockBusRepo.cambiarEstado).not.toHaveBeenCalled();
  });

  it('debe lanzar BusReemplazoNoValidoException si el bus de reemplazo no existe', async () => {
    await expect(
      useCase.ejecutar({ ...inputBase, replacementBusNumero: '77' })
    ).rejects.toThrow(BusReemplazoNoValidoException);

    expect(mockBusRepo.cambiarEstado).not.toHaveBeenCalled();
  });

  it.each([EstadoBus.MANTENIMIENTO, EstadoBus.INACTIVO, EstadoBus.FUERA_DE_SERVICIO])(
    'debe lanzar BusReemplazoNoValidoException si el bus de reemplazo está en estado %s',
    async (estado) => {
      busReemplazo.estado = estado;

      await expect(
        useCase.ejecutar({ ...inputBase, replacementBusNumero: '30' })
      ).rejects.toThrow(BusReemplazoNoValidoException);

      expect(mockBusRepo.cambiarEstado).not.toHaveBeenCalled();
    }
  );

  it('debe lanzar BusReemplazoNoValidoException si el reemplazo es el mismo bus del incidente', async () => {
    await expect(
      useCase.ejecutar({ ...inputBase, replacementBusNumero: '25' })
    ).rejects.toThrow(BusReemplazoNoValidoException);

    expect(mockBusRepo.cambiarEstado).not.toHaveBeenCalled();
  });

  it('debe quitar los espacios del número de bus antes de consultar el repositorio', async () => {
    await useCase.ejecutar({ ...inputBase, busNumero: '  25  ' });

    expect(mockBusRepo.obtenerPorNumero).toHaveBeenCalledWith(1, '25');
  });
});