import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GestionarViajeRuta } from './GestionarViajeRuta';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import {
  RutaInvalidaException,
  RutaEstadoInvalidoException,
  RutaFueraDeFechaException,
  ChoferNoDisponibleParaRutaException,
} from '../../Domain/Exceptions/RutaException';

describe('GestionarViajeRuta UseCase', () => {
  let useCase: GestionarViajeRuta;
  let mockRutaRepo: IRutaRepository;

  beforeEach(() => {
    mockRutaRepo = {
      obtenerTodas: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorHojaRuta: vi.fn(),
      obtenerPorBusYFecha: vi.fn(),
      obtenerPorChoferYFecha: vi.fn(),
      crear: vi.fn(),
      actualizar: vi.fn(),
      cambiarEstado: vi.fn(),
      eliminar: vi.fn(),
    };

    useCase = new GestionarViajeRuta(mockRutaRepo);
  });

  it('debe iniciar viaje cuando la ruta está en estado Programada', async () => {
    const r = new Ruta(1, 10, '2026-06-01', EstadoRuta.PROGRAMADA);
    r.id = 1;
    const rEnCurso = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    rEnCurso.id = 1;

    vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(r);
    vi.mocked(mockRutaRepo.cambiarEstado).mockResolvedValue(rEnCurso);

    const res = await useCase.iniciarViaje(1);

    expect(res.estado).toBe(EstadoRuta.EN_CURSO);
    expect(mockRutaRepo.cambiarEstado).toHaveBeenCalledWith(1, EstadoRuta.EN_CURSO);
  });

  it('debe fallar al iniciar viaje si la ruta no está Programada', async () => {
    const rFinalizada = new Ruta(1, 10, '2026-06-01', EstadoRuta.FINALIZADA);
    rFinalizada.id = 1;

    vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(rFinalizada);

    await expect(useCase.iniciarViaje(1)).rejects.toThrow(RutaEstadoInvalidoException);
    expect(mockRutaRepo.cambiarEstado).not.toHaveBeenCalled();
  });

  it('debe finalizar viaje, calcular hora de llegada y cambiar estado a Finalizada', async () => {
    const r = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    r.id = 1;
    const rFinalizada = new Ruta(1, 10, '2026-06-01', EstadoRuta.FINALIZADA);
    rFinalizada.id = 1;

    vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(r);
    vi.mocked(mockRutaRepo.actualizar).mockResolvedValue(rFinalizada);
    vi.mocked(mockRutaRepo.cambiarEstado).mockResolvedValue(rFinalizada);

    const res = await useCase.finalizarViaje(1, 'Sin incidentes');

    expect(res.estado).toBe(EstadoRuta.FINALIZADA);
    expect(mockRutaRepo.actualizar).toHaveBeenCalledWith(1, expect.objectContaining({
      observacionChofer: 'Sin incidentes',
      horaLlegada: expect.stringMatching(/^\d{2}:\d{2}$/),
    }));
    expect(mockRutaRepo.cambiarEstado).toHaveBeenCalledWith(1, EstadoRuta.FINALIZADA);
  });

  it('debe cancelar viaje con motivo registrado', async () => {
    const rCancelada = new Ruta(1, 10, '2026-06-01', EstadoRuta.CANCELADA);
    rCancelada.id = 1;

    vi.mocked(mockRutaRepo.actualizar).mockResolvedValue(rCancelada);
    vi.mocked(mockRutaRepo.cambiarEstado).mockResolvedValue(rCancelada);

    const res = await useCase.cancelarViaje(1, 'Derrumbe en vía');

    expect(res.estado).toBe(EstadoRuta.CANCELADA);
    expect(mockRutaRepo.actualizar).toHaveBeenCalledWith(1, {
      observacionChofer: 'Cancelado: Derrumbe en vía',
    });
    expect(mockRutaRepo.cambiarEstado).toHaveBeenCalledWith(1, EstadoRuta.CANCELADA);
  });

  it('debe registrar novedad de emergencia concatenando formato oficial', async () => {
    const r = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    r.id = 1;
    r.observacionChofer = 'Salida puntual';

    const rActualizada = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    rActualizada.id = 1;
    rActualizada.observacionChofer = 'Salida puntual | EMERGENCIA: Falla de frenos';

    vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(r);
    vi.mocked(mockRutaRepo.actualizar).mockResolvedValue(rActualizada);

    const res = await useCase.registrarEmergencia(1, 'Falla de frenos');

    expect(res.observacionChofer).toContain('EMERGENCIA: Falla de frenos');
    expect(mockRutaRepo.actualizar).toHaveBeenCalledWith(1, {
      observacionChofer: 'Salida puntual | EMERGENCIA: Falla de frenos',
    });
  });

  it('debe rechazar registro de emergencia si no se envía detalle', async () => {
    await expect(useCase.registrarEmergencia(1, '   ')).rejects.toThrow(RutaInvalidaException);
    expect(mockRutaRepo.actualizar).not.toHaveBeenCalled();
  });

  it('debe asignar chofer a la ruta', async () => {
    const r = new Ruta(1, 10, '2026-06-01', EstadoRuta.PROGRAMADA);
    r.id = 1;
    r.choferId = 'chofer-42';

    vi.mocked(mockRutaRepo.actualizar).mockResolvedValue(r);

    const res = await useCase.asignarChofer(1, 'chofer-42');

    expect(res.choferId).toBe('chofer-42');
    expect(mockRutaRepo.actualizar).toHaveBeenCalledWith(1, { choferId: 'chofer-42' });
  });

  it('debe eliminar ruta llamando al repositorio', async () => {
    vi.mocked(mockRutaRepo.eliminar).mockResolvedValue(undefined);

    await useCase.eliminarRuta(1);

    expect(mockRutaRepo.eliminar).toHaveBeenCalledWith(1);
  });

  describe('inicio de viajes según la fecha', () => {
    const crearConHoy = (hoy: string) => new GestionarViajeRuta(mockRutaRepo, () => hoy);
    const rutaProgramada = (fecha: string) => {
      const ruta = new Ruta(1, 10, fecha, EstadoRuta.PROGRAMADA);
      ruta.id = 1;
      return ruta;
    };

    it('rechaza iniciar un viaje programado para una fecha futura, sin cambiar su estado', async () => {
      vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(rutaProgramada('2026-11-12'));

      await expect(crearConHoy('2026-11-10').iniciarViaje(1)).rejects.toThrow(RutaFueraDeFechaException);
      await expect(crearConHoy('2026-11-10').iniciarViaje(1)).rejects.toThrow('2026-11-12');
      expect(mockRutaRepo.cambiarEstado).not.toHaveBeenCalled();
    });

    it('permite iniciar el viaje el mismo día de la ruta', async () => {
      vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(rutaProgramada('2026-11-10'));
      vi.mocked(mockRutaRepo.cambiarEstado).mockResolvedValue(rutaProgramada('2026-11-10'));

      await crearConHoy('2026-11-10').iniciarViaje(1);

      expect(mockRutaRepo.cambiarEstado).toHaveBeenCalledWith(1, EstadoRuta.EN_CURSO);
    });

    it('permite iniciar un viaje pendiente de un día anterior', async () => {
      vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(rutaProgramada('2026-11-09'));
      vi.mocked(mockRutaRepo.cambiarEstado).mockResolvedValue(rutaProgramada('2026-11-09'));

      await crearConHoy('2026-11-10').iniciarViaje(1);

      expect(mockRutaRepo.cambiarEstado).toHaveBeenCalledWith(1, EstadoRuta.EN_CURSO);
    });

    it('la fecha por defecto es la de hoy: un viaje de mañana se rechaza y uno de ayer no', async () => {
      const dosDigitos = (n: number) => String(n).padStart(2, '0');
      const manana = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const fechaManana = `${manana.getFullYear()}-${dosDigitos(manana.getMonth() + 1)}-${dosDigitos(manana.getDate())}`;
      vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(rutaProgramada(fechaManana));

      await expect(useCase.iniciarViaje(1)).rejects.toThrow(RutaFueraDeFechaException);
    });
  });

  describe('asignar chofer sin dobles turnos', () => {
    const crearRuta = (id: number, fecha: string, salida?: string, llegada?: string, estado: EstadoRuta = EstadoRuta.PROGRAMADA) => {
      const ruta = new Ruta(1, 10 + id, fecha, estado);
      ruta.id = id;
      ruta.horaSalida = salida;
      ruta.horaLlegada = llegada;
      return ruta;
    };

    const rutaPorAsignar = () => crearRuta(7, '2026-06-15', '14:00', '17:00');

    beforeEach(() => {
      vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockResolvedValue([]);
      vi.mocked(mockRutaRepo.actualizar).mockImplementation(async (id, cambios) =>
        Object.assign(crearRuta(id, '2026-06-15'), cambios),
      );
    });

    it('rechaza asignar un chofer que ya conduce otro viaje que se solapa, e indica el horario', async () => {
      vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(rutaPorAsignar());
      vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockResolvedValue([crearRuta(8, '2026-06-15', '13:00', '16:00')]);

      await expect(useCase.asignarChofer(7, 'chofer-1')).rejects.toBeInstanceOf(ChoferNoDisponibleParaRutaException);
      await expect(useCase.asignarChofer(7, 'chofer-1')).rejects.toThrow('(13:00–16:00)');
      expect(mockRutaRepo.actualizar).not.toHaveBeenCalled();
    });

    it('permite asignarlo si sus otros viajes no se solapan', async () => {
      vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(rutaPorAsignar());
      vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockResolvedValue([crearRuta(8, '2026-06-15', '08:00', '11:00')]);

      const res = await useCase.asignarChofer(7, 'chofer-1');

      expect(res.choferId).toBe('chofer-1');
      expect(mockRutaRepo.obtenerPorChoferYFecha).toHaveBeenCalledWith('chofer-1', '2026-06-14');
      expect(mockRutaRepo.obtenerPorChoferYFecha).toHaveBeenCalledWith('chofer-1', '2026-06-16');
    });

    it('la propia ruta no cuenta como conflicto (reasignar al mismo chofer)', async () => {
      vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(rutaPorAsignar());
      vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockResolvedValue([rutaPorAsignar()]);

      await expect(useCase.asignarChofer(7, 'chofer-1')).resolves.toBeDefined();
    });

    it('los viajes cancelados del chofer no cuentan', async () => {
      vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(rutaPorAsignar());
      vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockResolvedValue([
        crearRuta(8, '2026-06-15', '14:00', '17:00', EstadoRuta.CANCELADA),
      ]);

      await expect(useCase.asignarChofer(7, 'chofer-1')).resolves.toBeDefined();
    });

    it('detecta el choque con un viaje nocturno de ayer que llega de madrugada', async () => {
      vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(crearRuta(7, '2026-06-15', '05:00', '08:00'));
      vi.mocked(mockRutaRepo.obtenerPorChoferYFecha).mockImplementation(async (_id, fecha) =>
        fecha === '2026-06-14' ? [crearRuta(8, '2026-06-14', '22:00', '06:00')] : [],
      );

      await expect(useCase.asignarChofer(7, 'chofer-1')).rejects.toThrow('(2026-06-14 22:00–06:00)');
    });

    it('si la ruta aún no tiene hora no se puede comparar y la asignación sigue siendo posible', async () => {
      vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(crearRuta(7, '2026-06-15'));

      await expect(useCase.asignarChofer(7, 'chofer-1')).resolves.toBeDefined();
      expect(mockRutaRepo.obtenerPorChoferYFecha).not.toHaveBeenCalled();
    });
  });
});
