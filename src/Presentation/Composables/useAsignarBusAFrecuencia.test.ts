import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAsignarBusAFrecuencia } from './useAsignarBusAFrecuencia';
import { AsignarBusAFrecuenciaUseCase } from '../../Application/UseCases/AsignarBusAFrecuencia';
import type { AsignarBusAFrecuenciaDto } from '../../Application/Dtos/AsignarBusAFrecuenciaDto';
import type { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import { EstadoBus } from '../../Domain/Constants/EstadosSistema';
import { BusNoActivoException } from '../../Domain/Exceptions/BusException';
import {
  busDePrueba,
  crearBusRepoMock,
  crearFrecuenciaRepoMock,
  crearRutaRepoMock,
  frecuenciaDePrueba,
} from '../../Application/testing/mocksFrecuencias';

describe('useAsignarBusAFrecuencia Composable', () => {
  let frecuenciaRepo: IFrecuenciaRepository;
  let busRepo: IBusRepository;
  let rutaRepo: IRutaRepository;
  let useCase: AsignarBusAFrecuenciaUseCase;
  const dto: AsignarBusAFrecuenciaDto = { frecuenciaId: 1, busId: 10, fecha: '2026-10-26' };

  beforeEach(() => {
    frecuenciaRepo = crearFrecuenciaRepoMock();
    busRepo = crearBusRepoMock();
    rutaRepo = crearRutaRepoMock();
    useCase = new AsignarBusAFrecuenciaUseCase(frecuenciaRepo, busRepo, rutaRepo);

    vi.mocked(frecuenciaRepo.obtenerPorId).mockResolvedValue(frecuenciaDePrueba(1));
    vi.mocked(busRepo.obtenerPorId).mockResolvedValue(busDePrueba(10));
    vi.mocked(rutaRepo.obtenerPorBusYFecha).mockResolvedValue([]);
    vi.mocked(rutaRepo.crear).mockImplementation(async (ruta) => {
      ruta.id = 500;
      return ruta;
    });
  });

  it('debe iniciar con estado por defecto limpio', () => {
    const { loading, error, ruta, asignado } = useAsignarBusAFrecuencia(useCase);

    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(ruta.value).toBeNull();
    expect(asignado.value).toBe(false);
  });

  it('debe actualizar loading, ruta y asignado al asignar con éxito', async () => {
    const { loading, error, ruta, asignado, asignar } = useAsignarBusAFrecuencia(useCase);

    const promesa = asignar(dto);
    expect(loading.value).toBe(true);

    const resultado = await promesa;

    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(resultado.id).toBe(500);
    expect(ruta.value).toBe(resultado);
    expect(asignado.value).toBe(true);
    expect(rutaRepo.crear).toHaveBeenCalledTimes(1);
  });

  it('debe capturar el mensaje de la excepción de dominio y resetear loading al fallar', async () => {
    vi.mocked(busRepo.obtenerPorId).mockResolvedValue(busDePrueba(10, 1, EstadoBus.MANTENIMIENTO));
    const { loading, error, ruta, asignado, asignar } = useAsignarBusAFrecuencia(useCase);

    await expect(asignar(dto)).rejects.toThrow(BusNoActivoException);

    expect(loading.value).toBe(false);
    expect(error.value).toContain('no se encuentra activo');
    expect(ruta.value).toBeNull();
    expect(asignado.value).toBe(false);
    expect(rutaRepo.crear).not.toHaveBeenCalled();
  });

  it('debe usar un mensaje por defecto cuando el error no es una instancia de Error', async () => {
    vi.mocked(frecuenciaRepo.obtenerPorId).mockRejectedValue('fallo de red');
    const { error, asignar } = useAsignarBusAFrecuencia(useCase);

    await expect(asignar(dto)).rejects.toBe('fallo de red');

    expect(error.value).toBe('Error al asignar el bus a la frecuencia');
  });

  it('debe limpiar el error y la ruta anteriores al iniciar una nueva asignación', async () => {
    vi.mocked(busRepo.obtenerPorId).mockResolvedValueOnce(busDePrueba(10, 1, EstadoBus.INACTIVO));
    const { error, ruta, asignar } = useAsignarBusAFrecuencia(useCase);

    await expect(asignar(dto)).rejects.toThrow();
    expect(error.value).not.toBeNull();

    await asignar(dto);

    expect(error.value).toBeNull();
    expect(ruta.value?.id).toBe(500);
  });

  it('debe restablecer ruta y error al ejecutar limpiar()', async () => {
    const { error, ruta, asignado, asignar, limpiar } = useAsignarBusAFrecuencia(useCase);
    await asignar(dto);

    limpiar();

    expect(ruta.value).toBeNull();
    expect(error.value).toBeNull();
    expect(asignado.value).toBe(false);
  });
});
