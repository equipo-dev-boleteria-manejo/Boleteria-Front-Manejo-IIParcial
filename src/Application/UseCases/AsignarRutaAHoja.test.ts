import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AsignarRutaAHoja, type AsignarRutaAHojaInput } from './AsignarRutaAHoja';
import type { IHojaRutaRepository } from '../../Domain/Repositories/IHojaRutaRepository';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import type { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import { HojaRuta } from '../../Domain/Entities/HojaRuta';
import { Ruta } from '../../Domain/Entities/Ruta';
import { Frecuencia } from '../../Domain/Entities/Frecuencia';
import { Bus } from '../../Domain/Entities/Bus';
import { EstadoBus, EstadoHojaRuta, EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import {
  FrecuenciaNoDisponibleParaRutaException,
  BusNoActivoParaRutaException,
  RutaSolapadaException,
} from '../../Domain/Exceptions/RutaException';
import { HojaRutaYaCerradaException } from '../../Domain/Exceptions/HojaRutaException';

describe('AsignarRutaAHoja UseCase', () => {
  let useCase: AsignarRutaAHoja;
  let mockHojaRutaRepo: IHojaRutaRepository;
  let mockRutaRepo: IRutaRepository;
  let mockFrecuenciaRepo: IFrecuenciaRepository;
  let mockBusRepo: IBusRepository;

  beforeEach(() => {
    mockHojaRutaRepo = {
      obtenerTodas: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorFecha: vi.fn(),
      crear: vi.fn(),
      actualizar: vi.fn(),
      cambiarEstado: vi.fn(),
    };

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

    useCase = new AsignarRutaAHoja(mockHojaRutaRepo, mockRutaRepo, mockFrecuenciaRepo, mockBusRepo);
  });

  it('debe asignar una ruta a una hoja de ruta existente si no hay solapamiento', async () => {
    const hojaRuta = new HojaRuta('2026-06-10', EstadoHojaRuta.BORRADOR);
    hojaRuta.id = 1;

    const rutaExistente = new Ruta(1, 50, '2026-06-10', EstadoRuta.PROGRAMADA);
    rutaExistente.horaSalida = '07:00';
    rutaExistente.horaLlegada = '10:00';
    hojaRuta.rutas = [rutaExistente];

    const frecuenciaNueva = new Frecuencia(1, 'Quito', 'Ambato', '12:00', 'FREQ-002');
    frecuenciaNueva.id = 2;

    const rutaCreada = new Ruta(2, 50, '2026-06-10', EstadoRuta.PROGRAMADA);
    rutaCreada.id = 102;

    vi.mocked(mockHojaRutaRepo.obtenerPorFecha).mockResolvedValue(hojaRuta);
    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuenciaNueva);
    vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(new Bus(1, '050', 'ABC-5050', 40, EstadoBus.ACTIVO));
    vi.mocked(mockRutaRepo.crear).mockResolvedValue(rutaCreada);

    const input: AsignarRutaAHojaInput = {
      busId: 50,
      frecuenciaId: 2,
      fecha: '2026-06-10',
    };

    const result = await useCase.ejecutar(input);

    expect(result.success).toBe(true);
    expect(result.ruta).toBeDefined();
    expect(mockRutaRepo.crear).toHaveBeenCalled();
  });

  it('debe fallar y lanzar excepción de dominio si la nueva ruta se solapa con una existente para el mismo bus', async () => {
    const hojaRuta = new HojaRuta('2026-06-10', EstadoHojaRuta.BORRADOR);
    hojaRuta.id = 1;

    const rutaExistente = new Ruta(1, 50, '2026-06-10', EstadoRuta.PROGRAMADA);
    rutaExistente.horaSalida = '07:00';
    rutaExistente.horaLlegada = '10:00';
    hojaRuta.rutas = [rutaExistente];

    const frecuenciaSolapada = new Frecuencia(1, 'Quito', 'Latacunga', '08:00', 'FREQ-003');
    frecuenciaSolapada.id = 3;

    vi.mocked(mockHojaRutaRepo.obtenerPorFecha).mockResolvedValue(hojaRuta);
    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuenciaSolapada);
    vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(new Bus(1, '050', 'ABC-5050', 40, EstadoBus.ACTIVO));

    await expect(
      useCase.ejecutar({
        busId: 50,
        frecuenciaId: 3,
        fecha: '2026-06-10',
      })
    ).rejects.toThrow(RutaSolapadaException);

    await expect(
      useCase.ejecutar({
        busId: 50,
        frecuenciaId: 3,
        fecha: '2026-06-10',
      })
    ).rejects.toThrow(/solapa/i);
  });

  it('debe permitir asignar si el horario coincide pero es para un bus diferente', async () => {
    const hojaRuta = new HojaRuta('2026-06-10', EstadoHojaRuta.BORRADOR);
    hojaRuta.id = 1;

    const rutaBus51 = new Ruta(1, 51, '2026-06-10', EstadoRuta.PROGRAMADA);
    rutaBus51.horaSalida = '07:00';
    rutaBus51.horaLlegada = '10:00';
    hojaRuta.rutas = [rutaBus51];

    const frecuencia = new Frecuencia(1, 'Quito', 'Latacunga', '08:00', 'FREQ-003');
    frecuencia.id = 3;

    const rutaCreada = new Ruta(3, 50, '2026-06-10', EstadoRuta.PROGRAMADA);
    rutaCreada.id = 103;

    vi.mocked(mockHojaRutaRepo.obtenerPorFecha).mockResolvedValue(hojaRuta);
    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuencia);
    vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(new Bus(1, '050', 'ABC-5050', 40, EstadoBus.ACTIVO));
    vi.mocked(mockRutaRepo.crear).mockResolvedValue(rutaCreada);

    const result = await useCase.ejecutar({
      busId: 50,
      frecuenciaId: 3,
      fecha: '2026-06-10',
    });

    expect(result.success).toBe(true);
    expect(result.ruta).toBeDefined();
  });

  it('debe crear una nueva hoja de ruta automáticamente si no existe para esa fecha', async () => {
    vi.mocked(mockHojaRutaRepo.obtenerPorFecha).mockResolvedValue(null);
    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(
      new Frecuencia(1, 'Quito', 'Ambato', '07:00', 'FREQ-001')
    );
    vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(new Bus(1, '050', 'ABC-5050', 40, EstadoBus.ACTIVO));

    const nuevaHoja = new HojaRuta('2026-06-10', EstadoHojaRuta.BORRADOR);
    nuevaHoja.id = 5;
    vi.mocked(mockHojaRutaRepo.crear).mockResolvedValue(nuevaHoja);

    const rutaCreada = new Ruta(1, 50, '2026-06-10', EstadoRuta.PROGRAMADA);
    vi.mocked(mockRutaRepo.crear).mockResolvedValue(rutaCreada);

    const result = await useCase.ejecutar({
      busId: 50,
      frecuenciaId: 1,
      fecha: '2026-06-10',
      usuarioCreadorId: 'usr-admin-1',
    });

    expect(result.success).toBe(true);
    expect(mockHojaRutaRepo.crear).toHaveBeenCalledTimes(1);
    expect(result.hojaRuta?.id).toBe(5);
  });

  it('debe rechazar si la hoja de ruta ya está cerrada', async () => {
    const hojaCerrada = new HojaRuta('2026-06-10', EstadoHojaRuta.CERRADA);
    hojaCerrada.id = 1;

    vi.mocked(mockHojaRutaRepo.obtenerPorFecha).mockResolvedValue(hojaCerrada);
    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(
      new Frecuencia(1, 'Quito', 'Ambato', '07:00', 'FREQ-001')
    );
    vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(new Bus(1, '050', 'ABC-5050', 40, EstadoBus.ACTIVO));

    await expect(
      useCase.ejecutar({
        busId: 50,
        frecuenciaId: 1,
        fecha: '2026-06-10',
      })
    ).rejects.toThrow(HojaRutaYaCerradaException);

    await expect(
      useCase.ejecutar({
        busId: 50,
        frecuenciaId: 1,
        fecha: '2026-06-10',
      })
    ).rejects.toThrow(DomainException);
  });

  it('debe rechazar si la frecuencia no existe o está inactiva', async () => {
    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(null);

    await expect(
      useCase.ejecutar({
        busId: 50,
        frecuenciaId: 999,
        fecha: '2026-06-10',
      })
    ).rejects.toThrow(FrecuenciaNoDisponibleParaRutaException);

    await expect(
      useCase.ejecutar({
        busId: 50,
        frecuenciaId: 999,
        fecha: '2026-06-10',
      })
    ).rejects.toThrow(/Frecuencia no encontrada o inactiva/i);
  });

  it('debe rechazar si el bus no está Activo', async () => {
    const frecuencia = new Frecuencia(1, 'Quito', 'Ambato', '07:00', 'FREQ-001');
    const busInactivo = new Bus(1, '050', 'ABC-5050', 40, EstadoBus.FUERA_DE_SERVICIO);

    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuencia);
    vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(busInactivo);

    await expect(
      useCase.ejecutar({
        busId: 50,
        frecuenciaId: 1,
        fecha: '2026-06-10',
      })
    ).rejects.toThrow(BusNoActivoParaRutaException);

    await expect(
      useCase.ejecutar({
        busId: 50,
        frecuenciaId: 1,
        fecha: '2026-06-10',
      })
    ).rejects.toThrow(/no está en estado Activo/i);
  });
});
