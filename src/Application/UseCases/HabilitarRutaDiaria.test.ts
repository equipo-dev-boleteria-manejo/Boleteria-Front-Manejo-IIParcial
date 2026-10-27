import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HabilitarRutaDiaria, type HabilitarRutaInput } from './HabilitarRutaDiaria';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import type { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import { Ruta } from '../../Domain/Entities/Ruta';
import { Bus } from '../../Domain/Entities/Bus';
import { Frecuencia } from '../../Domain/Entities/Frecuencia';
import { EstadoBus, EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import {
  FechaRutaInvalidaException,
  FrecuenciaNoDisponibleParaRutaException,
  FrecuenciaFueraDeDiaException,
  BusNoDisponibleParaRutaException,
  BusNoActivoParaRutaException,
} from '../../Domain/Exceptions/RutaException';

describe('HabilitarRutaDiaria UseCase', () => {
  let habilitarRutaDiaria: HabilitarRutaDiaria;
  let mockRutaRepo: IRutaRepository;
  let mockBusRepo: IBusRepository;
  let mockFrecuenciaRepo: IFrecuenciaRepository;

  beforeEach(() => {
    mockRutaRepo = {
      obtenerTodas: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorHojaRuta: vi.fn(),
      obtenerPorBusYFecha: vi.fn().mockResolvedValue([]),
      obtenerPorChoferYFecha: vi.fn(),
      crear: vi.fn(),
      actualizar: vi.fn(),
      cambiarEstado: vi.fn(),
      eliminar: vi.fn(),
    };

    mockBusRepo = {
      obtenerTodos: vi.fn(),
      obtenerPorCooperativa: vi.fn(),
      obtenerDisponiblesParaOperar: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorPlaca: vi.fn(),
      obtenerPorNumero: vi.fn(),
      crear: vi.fn(),
      actualizar: vi.fn(),
      cambiarEstado: vi.fn(),
      eliminarLogico: vi.fn(),
    };

    mockFrecuenciaRepo = {
      obtenerTodas: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorCooperativa: vi.fn(),
      obtenerPorIdentificador: vi.fn(),
      buscarPorTramo: vi.fn(),
      crear: vi.fn(),
      actualizar: vi.fn(),
      desactivar: vi.fn(),
      obtenerParadas: vi.fn(),
      agregarParada: vi.fn(),
      actualizarParada: vi.fn(),
      eliminarParada: vi.fn(),
    };

    habilitarRutaDiaria = new HabilitarRutaDiaria(
      mockRutaRepo,
      mockBusRepo,
      mockFrecuenciaRepo
    );
  });

  it('debe habilitar una ruta diaria exitosamente con estado Programada', async () => {
    // 2026-06-01 es Lunes
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-06-01',
    };

    const frecuencia = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', 'FREQ-001');
    frecuencia.id = 1;

    const bus = new Bus(1, '001', 'ABC-1234', 40, EstadoBus.ACTIVO);
    bus.id = 10;

    const rutaEsperada = new Ruta(1, 10, '2026-06-01', EstadoRuta.PROGRAMADA);
    rutaEsperada.id = 100;

    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuencia);
    vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(bus);
    vi.mocked(mockRutaRepo.crear).mockResolvedValue(rutaEsperada);

    const resultado = await habilitarRutaDiaria.ejecutar(input);

    expect(resultado).toBeDefined();
    expect(resultado.estado).toBe(EstadoRuta.PROGRAMADA);
    expect(mockRutaRepo.crear).toHaveBeenCalledTimes(1);
  });

  it('debe rechazar si la fecha es inválida', async () => {
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 10,
      fecha: 'fecha-no-valida',
    };

    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(FechaRutaInvalidaException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(DomainException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(/fecha.*no es válida/i);
    expect(mockFrecuenciaRepo.obtenerPorId).not.toHaveBeenCalled();
  });

  it('debe rechazar si la frecuencia no existe', async () => {
    const input: HabilitarRutaInput = {
      frecuenciaId: 999,
      busId: 10,
      fecha: '2026-06-01',
    };

    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(null);

    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(FrecuenciaNoDisponibleParaRutaException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(DomainException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(/frecuencia.*no existe/i);
  });

  it('debe rechazar si la frecuencia está inactiva', async () => {
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-06-01',
    };

    const frecuenciaInactiva = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', 'FREQ-001');
    frecuenciaInactiva.activa = false;

    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuenciaInactiva);

    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(FrecuenciaNoDisponibleParaRutaException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(DomainException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(/no se encuentra activa/i);
  });

  it('debe rechazar si el bus no existe', async () => {
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 99,
      fecha: '2026-06-01',
    };

    const frecuencia = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', 'FREQ-001');
    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuencia);
    vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(null);

    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(BusNoActivoParaRutaException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(DomainException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(/bus.*no existe/i);
  });

  it('debe rechazar si el bus no está en estado Activo (FueraDeServicio o Mantenimiento)', async () => {
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-06-01',
    };

    const frecuencia = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', 'FREQ-001');
    const busInactivo = new Bus(1, '001', 'ABC-1234', 40, EstadoBus.FUERA_DE_SERVICIO);

    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuencia);
    vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(busInactivo);

    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(BusNoActivoParaRutaException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(DomainException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(/no está en estado Activo/i);
  });

  it('debe rechazar si el bus ya está asignado a otra ruta activa en esa fecha', async () => {
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-06-01',
    };

    const frecuencia = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', 'FREQ-001');
    const bus = new Bus(1, '001', 'ABC-1234', 40, EstadoBus.ACTIVO);
    const rutaExistente = new Ruta(2, 10, '2026-06-01', EstadoRuta.PROGRAMADA);

    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuencia);
    vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(bus);
    vi.mocked(mockRutaRepo.obtenerPorBusYFecha).mockResolvedValue([rutaExistente]);

    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(BusNoDisponibleParaRutaException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(DomainException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(/ya se encuentra asignado/i);
    expect(mockRutaRepo.obtenerPorBusYFecha).toHaveBeenCalledWith(10, '2026-06-01');
  });

  it('debe confiar plenamente en el contrato oficial IRutaRepository sin conversiones inseguras', async () => {
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-06-01',
    };

    const frecuencia = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', 'FREQ-001');
    const bus = new Bus(1, '001', 'ABC-1234', 40, EstadoBus.ACTIVO);
    const rutaEnCurso = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);

    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuencia);
    vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(bus);
    vi.mocked(mockRutaRepo.obtenerPorBusYFecha).mockResolvedValue([rutaEnCurso]);

    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(BusNoDisponibleParaRutaException);
    expect(mockRutaRepo.obtenerPorBusYFecha).toHaveBeenCalledWith(10, '2026-06-01');
  });

  it('debe rechazar si la fecha no coincide con los días de operación de la frecuencia', async () => {
    // 2026-06-04 es Jueves
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-06-04',
    };

    const frecuencia = new Frecuencia(
      1,
      'Quito',
      'Cuenca',
      '08:00',
      'FREQ-001',
      true,
      ['Lunes', 'Miercoles']
    );

    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuencia);

    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(FrecuenciaFueraDeDiaException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(DomainException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(/no opera los días Jueves/i);
  });

  it('debe funcionar tanto con ejecutar() como con execute()', async () => {
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-06-01',
    };

    const frecuencia = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', 'FREQ-001');
    const bus = new Bus(1, '001', 'ABC-1234', 40, EstadoBus.ACTIVO);
    const rutaEsperada = new Ruta(1, 10, '2026-06-01', EstadoRuta.PROGRAMADA);

    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuencia);
    vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(bus);
    vi.mocked(mockRutaRepo.crear).mockResolvedValue(rutaEsperada);

    const resultado = await habilitarRutaDiaria.execute(input);
    expect(resultado).toBeDefined();
    expect(resultado.frecuenciaId).toBe(1);
  });
});
