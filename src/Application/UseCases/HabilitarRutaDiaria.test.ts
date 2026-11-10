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
  ChoferNoDisponibleParaRutaException,
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

  describe('mensajes que nombran el bus como en la pantalla', () => {
    const input: HabilitarRutaInput = { frecuenciaId: 1, busId: 10, fecha: '2026-06-01' };

    it('el conflicto de horario indica el número y la placa del bus, no su id interno', async () => {
      const bus = new Bus(1, '30', 'PNS-789', 50, EstadoBus.ACTIVO);
      vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(
        new Frecuencia(1, 'Quito', 'Cuenca', '08:00', 'FREQ-001'),
      );
      vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(bus);
      vi.mocked(mockRutaRepo.obtenerPorBusYFecha).mockResolvedValue([new Ruta(2, 10, '2026-06-01', EstadoRuta.PROGRAMADA)]);

      await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(
        'El bus #30 (PNS-789) ya se encuentra asignado a una ruta activa en el mismo horario para la fecha 2026-06-01.',
      );
    });

    it('un bus que no está activo se nombra por número y placa', async () => {
      vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(
        new Frecuencia(1, 'Quito', 'Cuenca', '08:00', 'FREQ-001'),
      );
      vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(new Bus(1, '26', 'PBA-254', 40, EstadoBus.MANTENIMIENTO));

      await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow('El bus #26 (PBA-254) no está en estado Activo.');
    });

    it('un bus que no existe solo puede nombrarse por su id', async () => {
      vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(
        new Frecuencia(1, 'Quito', 'Cuenca', '08:00', 'FREQ-001'),
      );
      vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(null);

      await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow('El bus con ID 10 no existe o no está en estado Activo.');
    });
  });

  describe('varios viajes del mismo bus el mismo día', () => {
    const input = (extras: Partial<HabilitarRutaInput> = {}): HabilitarRutaInput => ({
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-06-01',
      ...extras,
    });

    const rutaExistente = (salida: string | undefined, llegada: string | undefined, estado: EstadoRuta) => {
      const ruta = new Ruta(2, 10, '2026-06-01', estado);
      ruta.horaSalida = salida;
      ruta.horaLlegada = llegada;
      return ruta;
    };

    beforeEach(() => {
      vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(
        new Frecuencia(1, 'Quito', 'Cuenca', '14:00', 'FREQ-001'),
      );
      vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(new Bus(1, '30', 'PNS-789', 50, EstadoBus.ACTIVO));
      vi.mocked(mockRutaRepo.crear).mockImplementation(async (ruta) => ruta);
    });

    it('permite un segundo viaje del mismo bus el mismo día si los horarios no se solapan', async () => {
      vi.mocked(mockRutaRepo.obtenerPorBusYFecha).mockResolvedValue([
        rutaExistente('06:00:00', '09:00:00', EstadoRuta.FINALIZADA),
      ]);

      const ruta = await habilitarRutaDiaria.ejecutar(input());

      expect(ruta.horaSalida).toBe('14:00');
      expect(mockRutaRepo.crear).toHaveBeenCalled();
    });

    it('rechaza un viaje que se solapa e indica el horario ocupado', async () => {
      vi.mocked(mockRutaRepo.obtenerPorBusYFecha).mockResolvedValue([
        rutaExistente('13:00', '16:00', EstadoRuta.PROGRAMADA),
      ]);

      await expect(habilitarRutaDiaria.ejecutar(input())).rejects.toThrow(BusNoDisponibleParaRutaException);
      await expect(habilitarRutaDiaria.ejecutar(input())).rejects.toThrow('(13:00–16:00)');
      expect(mockRutaRepo.crear).not.toHaveBeenCalled();
    });

    it('un viaje que sale justo cuando el otro llega no se solapa', async () => {
      vi.mocked(mockRutaRepo.obtenerPorBusYFecha).mockResolvedValue([
        rutaExistente('11:00', '14:00', EstadoRuta.PROGRAMADA),
      ]);

      await expect(habilitarRutaDiaria.ejecutar(input())).resolves.toBeDefined();
    });

    it('usa el horario indicado en la solicitud en lugar del de la frecuencia', async () => {
      vi.mocked(mockRutaRepo.obtenerPorBusYFecha).mockResolvedValue([
        rutaExistente('14:00', '17:00', EstadoRuta.PROGRAMADA),
      ]);

      await expect(habilitarRutaDiaria.ejecutar(input({ horaSalida: '20:00' }))).resolves.toMatchObject({
        horaSalida: '20:00',
      });
    });

    it('tiene en cuenta el tiempo de viaje indicado: un viaje largo puede chocar con uno posterior', async () => {
      vi.mocked(mockRutaRepo.obtenerPorBusYFecha).mockResolvedValue([
        rutaExistente('20:00', '22:00', EstadoRuta.PROGRAMADA),
      ]);

      await expect(habilitarRutaDiaria.ejecutar(input())).resolves.toBeDefined();
      await expect(habilitarRutaDiaria.ejecutar(input({ tiempoViajeMinutos: 600 }))).rejects.toThrow(
        BusNoDisponibleParaRutaException,
      );
    });

    it('los viajes cancelados no ocupan al bus', async () => {
      vi.mocked(mockRutaRepo.obtenerPorBusYFecha).mockResolvedValue([
        rutaExistente('14:00', '17:00', EstadoRuta.CANCELADA),
      ]);

      await expect(habilitarRutaDiaria.ejecutar(input())).resolves.toBeDefined();
    });

    it('un viaje sin hora conocida se asume ocupado: no se puede demostrar que no se solape', async () => {
      vi.mocked(mockRutaRepo.obtenerPorBusYFecha).mockResolvedValue([
        rutaExistente(undefined, undefined, EstadoRuta.PROGRAMADA),
      ]);

      await expect(habilitarRutaDiaria.ejecutar(input())).rejects.toThrow(BusNoDisponibleParaRutaException);
    });

    it('un viaje nocturno ocupa al bus hasta la madrugada', async () => {
      vi.mocked(mockRutaRepo.obtenerPorBusYFecha).mockResolvedValue([
        rutaExistente('22:00', '06:00', EstadoRuta.PROGRAMADA),
      ]);

      await expect(habilitarRutaDiaria.ejecutar(input({ horaSalida: '23:00' }))).rejects.toThrow(
        BusNoDisponibleParaRutaException,
      );
      await expect(habilitarRutaDiaria.ejecutar(input({ horaSalida: '10:00' }))).resolves.toBeDefined();
    });
  });

  describe('un chofer no puede manejar dos viajes a la vez', () => {
    const input = (extras: Partial<HabilitarRutaInput> = {}): HabilitarRutaInput => ({
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-06-01',
      choferId: 'chofer-1',
      ...extras,
    });

    const crearRuta = (
      id: number,
      fecha: string,
      salida: string,
      llegada: string,
      estado: EstadoRuta = EstadoRuta.PROGRAMADA,
    ) => {
      const ruta = new Ruta(2, 99, fecha, estado);
      ruta.id = id;
      ruta.horaSalida = salida;
      ruta.horaLlegada = llegada;
      return ruta;
    };

    const rutasPorDia = (porFecha: Record<string, Ruta[]>) => async (_id: unknown, fecha: string) => porFecha[fecha] ?? [];

    beforeEach(() => {
      vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(
        new Frecuencia(1, 'Quito', 'Cuenca', '14:00', 'FREQ-001'),
      );
      vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(new Bus(1, '30', 'PNS-789', 50, EstadoBus.ACTIVO));
      vi.mocked(mockRutaRepo.obtenerPorBusYFecha).mockResolvedValue([]);
      vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockResolvedValue([]);
      vi.mocked(mockRutaRepo.crear).mockImplementation(async (ruta) => ruta);
    });

    it('permite asignar al chofer si no tiene otro viaje en ese horario, consultando los tres días', async () => {
      const ruta = await habilitarRutaDiaria.ejecutar(input());

      expect(ruta.choferId).toBe('chofer-1');
      expect(mockRutaRepo.obtenerPorChoferYFecha).toHaveBeenCalledWith('chofer-1', '2026-05-31');
      expect(mockRutaRepo.obtenerPorChoferYFecha).toHaveBeenCalledWith('chofer-1', '2026-06-01');
      expect(mockRutaRepo.obtenerPorChoferYFecha).toHaveBeenCalledWith('chofer-1', '2026-06-02');
    });

    it('rechaza si el chofer ya conduce otro bus que se solapa, e indica el horario', async () => {
      vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockImplementation(
        rutasPorDia({ '2026-06-01': [crearRuta(1, '2026-06-01', '13:00', '16:00')] }),
      );

      await expect(habilitarRutaDiaria.ejecutar(input())).rejects.toBeInstanceOf(ChoferNoDisponibleParaRutaException);
      await expect(habilitarRutaDiaria.ejecutar(input())).rejects.toThrow(
        'El chofer seleccionado ya tiene asignado otro viaje que se solapa con este horario (13:00–16:00).',
      );
      expect(mockRutaRepo.crear).not.toHaveBeenCalled();
    });

    it('permite un viaje que empieza justo cuando termina el anterior del chofer', async () => {
      vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockImplementation(
        rutasPorDia({ '2026-06-01': [crearRuta(1, '2026-06-01', '11:00', '14:00')] }),
      );

      await expect(habilitarRutaDiaria.ejecutar(input())).resolves.toBeDefined();
    });

    it('los viajes cancelados del chofer no cuentan', async () => {
      vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockImplementation(
        rutasPorDia({ '2026-06-01': [crearRuta(1, '2026-06-01', '14:00', '17:00', EstadoRuta.CANCELADA)] }),
      );

      await expect(habilitarRutaDiaria.ejecutar(input())).resolves.toBeDefined();
    });

    it('sin chofer indicado no consulta a ningún chofer', async () => {
      await habilitarRutaDiaria.ejecutar(input({ choferId: undefined }));

      expect(mockRutaRepo.obtenerPorChoferYFecha).not.toHaveBeenCalled();
    });

    it('un viaje nocturno del chofer que sale hoy choca con uno de mañana de madrugada', async () => {
      vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockImplementation(
        rutasPorDia({ '2026-06-02': [crearRuta(1, '2026-06-02', '03:00', '06:00')] }),
      );

      await expect(habilitarRutaDiaria.ejecutar(input({ horaSalida: '22:00', horaLlegada: '04:00' }))).rejects.toThrow(
        '(2026-06-02 03:00–06:00)',
      );
      await expect(habilitarRutaDiaria.ejecutar(input({ horaSalida: '22:00', horaLlegada: '02:00' }))).resolves.toBeDefined();
    });
  });

  describe('viajes de medianoche del bus', () => {
    beforeEach(() => {
      vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(
        new Frecuencia(1, 'Quito', 'Cuenca', '05:00', 'FREQ-001'),
      );
      vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(new Bus(1, '30', 'PNS-789', 50, EstadoBus.ACTIVO));
      vi.mocked(mockRutaRepo.crear).mockImplementation(async (ruta) => ruta);
      const nocturnoDeAyer = new Ruta(2, 10, '2026-05-31', EstadoRuta.PROGRAMADA);
      nocturnoDeAyer.horaSalida = '22:00';
      nocturnoDeAyer.horaLlegada = '06:00';
      vi.mocked(mockRutaRepo.obtenerPorBusYFecha).mockImplementation(async (_id, fecha) =>
        fecha === '2026-05-31' ? [nocturnoDeAyer] : [],
      );
    });

    it('el viaje nocturno de ayer sigue ocupando al bus en las primeras horas de hoy', async () => {
      await expect(
        habilitarRutaDiaria.ejecutar({ frecuenciaId: 1, busId: 10, fecha: '2026-06-01' }),
      ).rejects.toThrow('(2026-05-31 22:00–06:00)');
    });

    it('cuando el bus ya llegó, el viaje de hoy puede salir', async () => {
      await expect(
        habilitarRutaDiaria.ejecutar({ frecuenciaId: 1, busId: 10, fecha: '2026-06-01', horaSalida: '06:00' }),
      ).resolves.toBeDefined();
    });
  });
});
