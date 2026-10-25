import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AsignarBusAFrecuenciaUseCase } from './AsignarBusAFrecuencia';
import type { AsignarBusAFrecuenciaDto } from '../Dtos/AsignarBusAFrecuenciaDto';
import type { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import { Frecuencia } from '../../Domain/Entities/Frecuencia';
import { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoBus, EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import { BusNoActivoException, BusNoEncontradoException } from '../../Domain/Exceptions/BusException';
import {
  AsignacionBusInvalidaException,
  BusNoPerteneceACooperativaException,
  ConflictoHorarioBusException,
  FrecuenciaInactivaException,
  FrecuenciaNoEncontradaException,
  FrecuenciaNoOperaEnFechaException,
} from '../../Domain/Exceptions/FrecuenciaException';
import {
  busDePrueba,
  crearBusRepoMock,
  crearFrecuenciaRepoMock,
  crearRutaRepoMock,
  frecuenciaDePrueba,
} from '../testing/mocksFrecuencias';

const LUNES = '2026-10-26';
const DOMINGO = '2026-10-25';

function rutaExistente(frecuenciaId: number, extras: Partial<Ruta> = {}): Ruta {
  const ruta = new Ruta(frecuenciaId, 10, LUNES);
  Object.assign(ruta, extras);
  return ruta;
}

describe('AsignarBusAFrecuenciaUseCase', () => {
  let frecuenciaRepo: IFrecuenciaRepository;
  let busRepo: IBusRepository;
  let rutaRepo: IRutaRepository;
  let useCase: AsignarBusAFrecuenciaUseCase;
  let dto: AsignarBusAFrecuenciaDto;

  /** Registra las frecuencias que devolverá el repositorio según su ID. */
  const registrarFrecuencias = (...frecuencias: Frecuencia[]): void => {
    vi.mocked(frecuenciaRepo.obtenerPorId).mockImplementation(
      async (id) => frecuencias.find((frecuencia) => frecuencia.id === id) ?? null,
    );
  };

  beforeEach(() => {
    frecuenciaRepo = crearFrecuenciaRepoMock();
    busRepo = crearBusRepoMock();
    rutaRepo = crearRutaRepoMock();
    useCase = new AsignarBusAFrecuenciaUseCase(frecuenciaRepo, busRepo, rutaRepo);

    registrarFrecuencias(frecuenciaDePrueba(1, '08:00'));
    vi.mocked(busRepo.obtenerPorId).mockResolvedValue(busDePrueba(10));
    vi.mocked(rutaRepo.obtenerPorBusYFecha).mockResolvedValue([]);
    vi.mocked(rutaRepo.crear).mockImplementation(async (ruta) => {
      ruta.id = 500;
      return ruta;
    });

    dto = { frecuenciaId: 1, busId: 10, fecha: LUNES };
  });

  describe('asignación exitosa', () => {
    it('debe crear una Ruta programada con la hora y el tipo de la frecuencia', async () => {
      const ruta = await useCase.execute(dto);

      expect(rutaRepo.crear).toHaveBeenCalledTimes(1);
      expect(ruta.id).toBe(500);
      expect(ruta.frecuenciaId).toBe(1);
      expect(ruta.busId).toBe(10);
      expect(ruta.fecha).toBe(LUNES);
      expect(ruta.horaSalida).toBe('08:00');
      expect(ruta.esDirecta).toBe(true);
      expect(ruta.estado).toBe(EstadoRuta.PROGRAMADA);
    });

    it('debe funcionar de forma idéntica con el alias ejecutar()', async () => {
      const ruta = await useCase.ejecutar(dto);

      expect(ruta.id).toBe(500);
    });

    it('debe aceptar la fecha con espacios alrededor', async () => {
      const ruta = await useCase.execute({ ...dto, fecha: ` ${LUNES} ` });

      expect(ruta.fecha).toBe(LUNES);
    });
  });

  describe('validación de entrada', () => {
    it.each([
      ['frecuencia en 0', { frecuenciaId: 0 }],
      ['bus negativo', { busId: -1 }],
      ['bus decimal', { busId: 1.5 }],
      ['fecha vacía', { fecha: '' }],
      ['fecha con otro formato', { fecha: '26/10/2026' }],
      ['fecha inexistente', { fecha: '2026-02-30' }],
    ])('debe rechazar %s sin consultar repositorios', async (_caso, cambios) => {
      await expect(useCase.execute({ ...dto, ...cambios })).rejects.toThrow(AsignacionBusInvalidaException);

      expect(frecuenciaRepo.obtenerPorId).not.toHaveBeenCalled();
      expect(rutaRepo.crear).not.toHaveBeenCalled();
    });
  });

  describe('reglas de la frecuencia', () => {
    it('debe lanzar FrecuenciaNoEncontradaException si la frecuencia no existe', async () => {
      registrarFrecuencias();

      await expect(useCase.execute(dto)).rejects.toThrow(FrecuenciaNoEncontradaException);
      expect(rutaRepo.crear).not.toHaveBeenCalled();
    });

    it('debe lanzar FrecuenciaInactivaException si la frecuencia está desactivada', async () => {
      const inactiva = frecuenciaDePrueba(1);
      inactiva.desactivar();
      registrarFrecuencias(inactiva);

      await expect(useCase.execute(dto)).rejects.toThrow(FrecuenciaInactivaException);
      expect(busRepo.obtenerPorId).not.toHaveBeenCalled();
    });

    it('debe lanzar FrecuenciaNoOperaEnFechaException si no opera ese día de la semana', async () => {
      const soloLunes = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', 'FR-1', true, ['Lunes']);
      soloLunes.id = 1;
      registrarFrecuencias(soloLunes);

      await expect(useCase.execute({ ...dto, fecha: DOMINGO })).rejects.toThrow(FrecuenciaNoOperaEnFechaException);
      await expect(useCase.execute({ ...dto, fecha: LUNES })).resolves.toBeInstanceOf(Ruta);
    });
  });

  describe('reglas del bus', () => {
    it('debe lanzar BusNoEncontradoException si el bus no existe', async () => {
      vi.mocked(busRepo.obtenerPorId).mockResolvedValue(null);

      await expect(useCase.execute(dto)).rejects.toThrow(BusNoEncontradoException);
      expect(rutaRepo.crear).not.toHaveBeenCalled();
    });

    it('debe lanzar BusNoPerteneceACooperativaException si el bus es de otra cooperativa', async () => {
      vi.mocked(busRepo.obtenerPorId).mockResolvedValue(busDePrueba(10, 2));

      await expect(useCase.execute(dto)).rejects.toThrow(BusNoPerteneceACooperativaException);
      expect(rutaRepo.crear).not.toHaveBeenCalled();
    });

    it.each([EstadoBus.INACTIVO, EstadoBus.FUERA_DE_SERVICIO, EstadoBus.MANTENIMIENTO])(
      'debe lanzar BusNoActivoException si el bus está en estado %s',
      async (estado) => {
        vi.mocked(busRepo.obtenerPorId).mockResolvedValue(busDePrueba(10, 1, estado));

        await expect(useCase.execute(dto)).rejects.toThrow(BusNoActivoException);
        expect(rutaRepo.crear).not.toHaveBeenCalled();
      },
    );
  });

  describe('coherencia de horarios', () => {
    // Las frecuencias de prueba duran 240 min mínimo: la de las 08:00 ocupa 08:00-12:00.
    it('debe lanzar ConflictoHorarioBusException si el nuevo viaje se cruza con otro del bus', async () => {
      registrarFrecuencias(frecuenciaDePrueba(1, '10:00'), frecuenciaDePrueba(2, '08:00'));
      vi.mocked(rutaRepo.obtenerPorBusYFecha).mockResolvedValue([rutaExistente(2)]);

      await expect(useCase.execute(dto)).rejects.toThrow(ConflictoHorarioBusException);
      expect(rutaRepo.obtenerPorBusYFecha).toHaveBeenCalledWith(10, LUNES);
      expect(rutaRepo.crear).not.toHaveBeenCalled();
    });

    it('debe permitir un viaje que empieza después de terminar el anterior', async () => {
      registrarFrecuencias(frecuenciaDePrueba(1, '13:00'), frecuenciaDePrueba(2, '08:00'));
      vi.mocked(rutaRepo.obtenerPorBusYFecha).mockResolvedValue([rutaExistente(2)]);

      await expect(useCase.execute(dto)).resolves.toBeInstanceOf(Ruta);
    });

    it('debe considerar conflicto cuando un viaje empieza exactamente al terminar el otro', async () => {
      registrarFrecuencias(frecuenciaDePrueba(1, '12:00'), frecuenciaDePrueba(2, '08:00'));
      vi.mocked(rutaRepo.obtenerPorBusYFecha).mockResolvedValue([rutaExistente(2)]);

      await expect(useCase.execute(dto)).rejects.toThrow(ConflictoHorarioBusException);
    });

    it('debe ignorar las rutas canceladas del bus', async () => {
      registrarFrecuencias(frecuenciaDePrueba(1, '10:00'), frecuenciaDePrueba(2, '08:00'));
      vi.mocked(rutaRepo.obtenerPorBusYFecha).mockResolvedValue([
        rutaExistente(2, { estado: EstadoRuta.CANCELADA }),
      ]);

      await expect(useCase.execute(dto)).resolves.toBeInstanceOf(Ruta);
    });

    it('debe usar la hora de llegada de la ruta existente cuando está registrada', async () => {
      registrarFrecuencias(frecuenciaDePrueba(1, '08:00'), frecuenciaDePrueba(2, '06:00'));
      vi.mocked(rutaRepo.obtenerPorBusYFecha).mockResolvedValue([
        rutaExistente(2, { horaSalida: '06:00', horaLlegada: '07:00' }),
      ]);

      await expect(useCase.execute(dto)).resolves.toBeInstanceOf(Ruta);
    });

    it('debe usar el tiempo de viaje de la ruta existente cuando no hay hora de llegada', async () => {
      registrarFrecuencias(frecuenciaDePrueba(1, '10:00'), frecuenciaDePrueba(2, '08:00'));
      vi.mocked(rutaRepo.obtenerPorBusYFecha).mockResolvedValue([rutaExistente(2, { tiempoViajeMinutos: 60 })]);

      await expect(useCase.execute(dto)).resolves.toBeInstanceOf(Ruta);
    });

    it('debe detectar el cruce con un viaje que termina después de medianoche', async () => {
      registrarFrecuencias(frecuenciaDePrueba(1, '23:00'), frecuenciaDePrueba(2, '22:00'));
      vi.mocked(rutaRepo.obtenerPorBusYFecha).mockResolvedValue([
        rutaExistente(2, { horaSalida: '22:00', horaLlegada: '01:00' }),
      ]);

      await expect(useCase.execute(dto)).rejects.toThrow(ConflictoHorarioBusException);
    });

    it('debe consultar una sola vez la frecuencia de cada ruta existente', async () => {
      registrarFrecuencias(frecuenciaDePrueba(1, '20:00'), frecuenciaDePrueba(2, '06:00'));
      vi.mocked(rutaRepo.obtenerPorBusYFecha).mockResolvedValue([rutaExistente(2), rutaExistente(2)]);

      await useCase.execute(dto);

      // Una consulta para la frecuencia a asignar y una para la frecuencia 2.
      expect(frecuenciaRepo.obtenerPorId).toHaveBeenCalledTimes(2);
    });

    it('debe ignorar una ruta existente cuyo horario no se puede determinar', async () => {
      registrarFrecuencias(frecuenciaDePrueba(1, '08:00'));
      vi.mocked(rutaRepo.obtenerPorBusYFecha).mockResolvedValue([rutaExistente(77)]);

      await expect(useCase.execute(dto)).resolves.toBeInstanceOf(Ruta);
    });
  });
});
