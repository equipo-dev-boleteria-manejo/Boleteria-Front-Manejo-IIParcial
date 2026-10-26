import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportarIncidenteOperativo } from './ReportarIncidenteOperativo';
import type { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import type { IRutaRepository, RutaFiltros } from '../../Domain/Repositories/IRutaRepository';
import type { IVentaRepository } from '../../Domain/Repositories/IVentaRepository';
import { Bus } from '../../Domain/Entities/Bus';
import { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoBus, EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import { BusNoEncontradoException } from '../../Domain/Exceptions/BusException';
import { BusReemplazoNoValidoException } from '../../Domain/Exceptions/BusFueraDeServicioException';

describe('ReportarIncidenteOperativo', () => {
  let mockBusRepo: IBusRepository;
  let mockRutaRepo: IRutaRepository;
  let mockVentaRepo: IVentaRepository;
  let useCase: ReportarIncidenteOperativo;
  let busActual: Bus;
  let busReemplazo: Bus;

  const inputBase = {
    cooperativaId: 1,
    busNumero: '25',
    motivo: 'AveriaMecanica',
    descripcion: 'Falla en el motor',
  };

  function crearRutaEnCurso(): Ruta {
    const ruta = new Ruta(3, 5, '2026-10-26', EstadoRuta.EN_CURSO);
    ruta.id = 100;
    ruta.choferId = 'chofer-1';
    ruta.horaSalida = '08:00';
    ruta.hojaRutaId = 7;
    ruta.esDirecta = true;
    return ruta;
  }

  function crearRutaProgramada(id: number): Ruta {
    const ruta = new Ruta(3, 5, '2026-10-27', EstadoRuta.PROGRAMADA);
    ruta.id = id;
    return ruta;
  }

  function configurarRutas(enCurso: Ruta[], programadas: Ruta[]) {
    mockRutaRepo.obtenerTodas = vi.fn().mockImplementation(async (filtros?: RutaFiltros) => {
      if (filtros?.estado === EstadoRuta.EN_CURSO) return enCurso;
      if (filtros?.estado === EstadoRuta.PROGRAMADA) return programadas;
      return [];
    });
  }

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

    mockRutaRepo = {
      obtenerTodas: vi.fn().mockResolvedValue([]),
      obtenerPorId: vi.fn().mockResolvedValue(null),
      obtenerPorHojaRuta: vi.fn().mockResolvedValue([]),
      obtenerPorBusYFecha: vi.fn().mockResolvedValue([]),
      obtenerPorChoferYFecha: vi.fn().mockResolvedValue([]),
      crear: vi.fn().mockImplementation(async (ruta: Ruta) => {
        ruta.id = 200;
        return ruta;
      }),
      actualizar: vi.fn().mockResolvedValue(crearRutaEnCurso()),
      cambiarEstado: vi.fn().mockResolvedValue(crearRutaEnCurso()),
      eliminar: vi.fn().mockResolvedValue(undefined),
    };

    mockVentaRepo = {
      crearVenta: vi.fn(),
      cancelarVenta: vi.fn(),
      obtenerVentaPorId: vi.fn(),
      obtenerVentasPendientes: vi.fn(),
      obtenerVentasPorRuta: vi.fn(),
      aprobarVenta: vi.fn(),
      rechazarVenta: vi.fn(),
      migrarVentasARuta: vi.fn().mockResolvedValue(undefined),
    };

    useCase = new ReportarIncidenteOperativo(mockBusRepo, mockRutaRepo, mockVentaRepo);
  });

  it('debe sacar el bus de operación y responder sin rutas afectadas cuando no hay viajes', async () => {
    const resultado = await useCase.ejecutar(inputBase);

    expect(resultado.success).toBe(true);
    expect(resultado.incidenteId).toMatch(/^INC-5-/);
    expect(resultado.busActualizado.estado).toBe(EstadoBus.MANTENIMIENTO);
    expect(resultado.rutasAfectadas).toBe(0);
    expect(resultado.acciones.reemplazoPosible).toBe(false);
    expect(resultado.acciones.requiereConfirmacion).toBe(false);
    expect(resultado.acciones.mensaje).toContain('Bus 25');
    expect(mockBusRepo.cambiarEstado).toHaveBeenCalledWith(5, EstadoBus.MANTENIMIENTO);
    expect(mockRutaRepo.crear).not.toHaveBeenCalled();
  });

  it('debe contar las rutas programadas afectadas y pedir confirmación', async () => {
    configurarRutas([], [crearRutaProgramada(101), crearRutaProgramada(102)]);

    const resultado = await useCase.ejecutar(inputBase);

    expect(resultado.rutasAfectadas).toBe(2);
    expect(resultado.acciones.requiereConfirmacion).toBe(true);
  });

  it('debe cancelar la ruta en curso y registrar el incidente cuando no hay bus de reemplazo', async () => {
    configurarRutas([crearRutaEnCurso()], []);

    const resultado = await useCase.ejecutar(inputBase);

    expect(mockRutaRepo.cambiarEstado).toHaveBeenCalledWith(100, EstadoRuta.CANCELADA);
    expect(mockRutaRepo.actualizar).toHaveBeenCalledWith(100, {
      observacionChofer: expect.stringContaining('AveriaMecanica'),
    });
    expect(mockRutaRepo.crear).not.toHaveBeenCalled();
    expect(mockVentaRepo.migrarVentasARuta).not.toHaveBeenCalled();
    expect(resultado.acciones.nuevaRutaId).toBeUndefined();
    expect(resultado.acciones.mensaje).toContain('cancelado');
  });

  it('debe crear una ruta de transbordo y migrar las ventas cuando hay bus de reemplazo', async () => {
    configurarRutas([crearRutaEnCurso()], []);

    const resultado = await useCase.ejecutar({ ...inputBase, replacementBusNumero: '30' });

    const rutaNueva = vi.mocked(mockRutaRepo.crear).mock.calls[0][0];
    expect(rutaNueva.busId).toBe(6);
    expect(rutaNueva.estado).toBe(EstadoRuta.EN_CURSO);
    expect(rutaNueva.frecuenciaId).toBe(3);
    expect(rutaNueva.choferId).toBe('chofer-1');
    expect(rutaNueva.horaSalida).toBe('08:00');
    expect(rutaNueva.hojaRutaId).toBe(7);

    expect(mockVentaRepo.migrarVentasARuta).toHaveBeenCalledWith(100, 200);
    expect(resultado.acciones.reemplazoPosible).toBe(true);
    expect(resultado.acciones.nuevaRutaId).toBe(200);
    expect(resultado.acciones.busReemplazoSugerido).toEqual({ id: 6, numero: '30' });
  });

  it('debe lanzar BusNoEncontradoException si el bus no existe', async () => {
    await expect(
      useCase.ejecutar({ ...inputBase, busNumero: '99' })
    ).rejects.toThrow(BusNoEncontradoException);

    expect(mockBusRepo.cambiarEstado).not.toHaveBeenCalled();
  });

  it('debe lanzar un error si el motivo no es válido', async () => {
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

  it.each([EstadoBus.MANTENIMIENTO, EstadoBus.INACTIVO])(
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