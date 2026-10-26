import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFrecuencias } from './useFrecuencias';
import { CrearFrecuenciaUseCase } from '../../Application/UseCases/CrearFrecuencia';
import { GestionarFrecuenciasUseCase } from '../../Application/UseCases/GestionarFrecuencias';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import { ParadaIntermedia } from '../../Domain/Entities/Frecuencia';
import { FrecuenciaNoEncontradaException } from '../../Domain/Exceptions/FrecuenciaException';
import { crearFrecuenciaRepoMock, frecuenciaDePrueba } from '../../Application/testing/mocksFrecuencias';

describe('useFrecuencias Composable', () => {
  let repo: IFrecuenciaRepository;

  const crearComposable = () =>
    useFrecuencias(new GestionarFrecuenciasUseCase(repo), new CrearFrecuenciaUseCase(repo));

  beforeEach(() => {
    repo = crearFrecuenciaRepoMock();
  });

  it('debe iniciar con estado por defecto limpio', () => {
    const { loading, error, frecuencias, seleccionada, total, frecuenciasActivas } = crearComposable();

    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(frecuencias.value).toEqual([]);
    expect(seleccionada.value).toBeNull();
    expect(total.value).toBe(0);
    expect(frecuenciasActivas.value).toEqual([]);
  });

  it('debe cargar las frecuencias y calcular total y activas', async () => {
    const inactiva = frecuenciaDePrueba(2);
    inactiva.desactivar();
    vi.mocked(repo.obtenerTodas).mockResolvedValue([frecuenciaDePrueba(1), inactiva]);
    const { loading, frecuencias, total, frecuenciasActivas, cargar } = crearComposable();

    const promesa = cargar({ cooperativaId: 1 });
    expect(loading.value).toBe(true);
    await promesa;

    expect(loading.value).toBe(false);
    expect(repo.obtenerTodas).toHaveBeenCalledWith({ cooperativaId: 1 });
    expect(frecuencias.value).toHaveLength(2);
    expect(total.value).toBe(2);
    expect(idsDe(frecuenciasActivas.value)).toEqual([1]);
  });

  it('debe cargar por cooperativa y buscar por tramo reemplazando la lista', async () => {
    vi.mocked(repo.obtenerPorCooperativa).mockResolvedValue([frecuenciaDePrueba(1)]);
    vi.mocked(repo.buscarPorTramo).mockResolvedValue([frecuenciaDePrueba(3), frecuenciaDePrueba(4)]);
    const { frecuencias, cargarPorCooperativa, buscarPorTramo } = crearComposable();

    await cargarPorCooperativa(1);
    expect(idsDe(frecuencias.value)).toEqual([1]);

    await buscarPorTramo('Quito', 'Cuenca', 'Lunes');
    expect(repo.buscarPorTramo).toHaveBeenCalledWith('Quito', 'Cuenca', 'Lunes');
    expect(idsDe(frecuencias.value)).toEqual([3, 4]);
  });

  it('debe capturar el error y resetear loading al fallar la carga', async () => {
    vi.mocked(repo.obtenerTodas).mockRejectedValue(new Error('Sin conexión'));
    const { loading, error, frecuencias, cargar, limpiarError } = crearComposable();

    await expect(cargar()).rejects.toThrow('Sin conexión');

    expect(loading.value).toBe(false);
    expect(error.value).toBe('Sin conexión');
    expect(frecuencias.value).toEqual([]);

    limpiarError();
    expect(error.value).toBeNull();
  });

  it('debe seleccionar una frecuencia y permitir limpiar la selección', async () => {
    vi.mocked(repo.obtenerPorId).mockResolvedValue(frecuenciaDePrueba(5));
    const { seleccionada, seleccionar, limpiarSeleccion } = crearComposable();

    await seleccionar(5);
    expect(seleccionada.value?.id).toBe(5);

    limpiarSeleccion();
    expect(seleccionada.value).toBeNull();
  });

  it('debe reportar el error cuando la frecuencia a seleccionar no existe', async () => {
    vi.mocked(repo.obtenerPorId).mockResolvedValue(null);
    const { error, seleccionar } = crearComposable();

    await expect(seleccionar(9)).rejects.toThrow(FrecuenciaNoEncontradaException);

    expect(error.value).toContain('no encontrada');
  });

  it('debe agregar a la lista la frecuencia creada', async () => {
    vi.mocked(repo.crear).mockImplementation(async (frecuencia) => {
      frecuencia.id = 77;
      return frecuencia;
    });
    const { frecuencias, crearFrecuencia } = crearComposable();

    const nueva = await crearFrecuencia({
      cooperativaId: 1,
      ciudadOrigen: 'Quito',
      ciudadDestino: 'Ambato',
      horaSalida: '07:00',
      identificadorFrecuencia: 'FR-77',
    });

    expect(nueva.id).toBe(77);
    expect(idsDe(frecuencias.value)).toEqual([77]);
  });

  it('debe reportar el error y no modificar la lista si la frecuencia es inválida', async () => {
    const { error, frecuencias, crearFrecuencia } = crearComposable();

    await expect(
      crearFrecuencia({
        cooperativaId: 1,
        ciudadOrigen: 'Quito',
        ciudadDestino: 'Quito',
        horaSalida: '07:00',
        identificadorFrecuencia: 'FR-1',
      }),
    ).rejects.toThrow();

    expect(error.value).toContain('datos inválidos');
    expect(frecuencias.value).toEqual([]);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('debe reemplazar en la lista y en la selección la frecuencia actualizada', async () => {
    vi.mocked(repo.obtenerTodas).mockResolvedValue([frecuenciaDePrueba(1, '08:00'), frecuenciaDePrueba(2, '09:00')]);
    vi.mocked(repo.obtenerPorId).mockResolvedValue(frecuenciaDePrueba(1, '08:00'));
    vi.mocked(repo.actualizar).mockResolvedValue(frecuenciaDePrueba(1, '10:30'));
    const { frecuencias, seleccionada, cargar, seleccionar, actualizar } = crearComposable();
    await cargar();
    await seleccionar(1);

    await actualizar(1, { horaSalida: '10:30' });

    expect(frecuencias.value.map((f) => f.horaSalida)).toEqual(['10:30', '09:00']);
    expect(seleccionada.value?.horaSalida).toBe('10:30');
  });

  it('debe activar una frecuencia inactiva en la lista', async () => {
    const inactiva = frecuenciaDePrueba(1);
    inactiva.desactivar();
    vi.mocked(repo.obtenerTodas).mockResolvedValue([inactiva]);
    vi.mocked(repo.actualizar).mockResolvedValue(frecuenciaDePrueba(1));
    const { frecuenciasActivas, cargar, activar } = crearComposable();
    await cargar();
    expect(frecuenciasActivas.value).toHaveLength(0);

    await activar(1);

    expect(repo.actualizar).toHaveBeenCalledWith(1, { activa: true });
    expect(frecuenciasActivas.value).toHaveLength(1);
  });

  it('debe reflejar la desactivación recargando la frecuencia', async () => {
    const desactivada = frecuenciaDePrueba(1);
    desactivada.desactivar();
    vi.mocked(repo.obtenerTodas).mockResolvedValue([frecuenciaDePrueba(1)]);
    vi.mocked(repo.obtenerPorId)
      .mockResolvedValueOnce(frecuenciaDePrueba(1)) // verificación de existencia del caso de uso
      .mockResolvedValueOnce(desactivada); // recarga posterior
    const { frecuenciasActivas, cargar, desactivar } = crearComposable();
    await cargar();
    expect(frecuenciasActivas.value).toHaveLength(1);

    await desactivar(1);

    expect(repo.desactivar).toHaveBeenCalledWith(1);
    expect(frecuenciasActivas.value).toHaveLength(0);
  });

  it('debe recargar la frecuencia al agregar y eliminar paradas', async () => {
    const conParada = frecuenciaDePrueba(1);
    conParada.agregarParada(new ParadaIntermedia('Ambato', 3, 300));
    vi.mocked(repo.obtenerTodas).mockResolvedValue([frecuenciaDePrueba(1)]);
    vi.mocked(repo.agregarParada).mockImplementation(async (_id, parada) => parada);
    vi.mocked(repo.obtenerPorId).mockResolvedValueOnce(conParada).mockResolvedValueOnce(frecuenciaDePrueba(1));
    const { frecuencias, cargar, agregarParada, eliminarParada } = crearComposable();
    await cargar();

    await agregarParada(1, { ciudad: 'Ambato', orden: 3, minutosDesdeOrigen: 300 });
    expect(frecuencias.value[0].paradas).toHaveLength(3);

    await eliminarParada(1, 8);
    expect(repo.eliminarParada).toHaveBeenCalledWith(8);
    expect(frecuencias.value[0].paradas).toHaveLength(2);
  });
});

function idsDe(frecuencias: readonly { id?: number }[]): (number | undefined)[] {
  return frecuencias.map((frecuencia) => frecuencia.id);
}
