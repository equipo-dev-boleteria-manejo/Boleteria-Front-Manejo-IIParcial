import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFrecuencias } from './useFrecuencias';
import { CrearFrecuenciaUseCase } from '../../Application/UseCases/CrearFrecuencia';
import { GestionarFrecuenciasUseCase } from '../../Application/UseCases/GestionarFrecuencias';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import { ParadaIntermedia, type Frecuencia } from '../../Domain/Entities/Frecuencia';
import { FrecuenciaNoEncontradaException } from '../../Domain/Exceptions/FrecuenciaException';
import { crearFrecuenciaRepoMock, frecuenciaDePrueba } from '../../Application/testing/mocksFrecuencias';

describe('useFrecuencias Composable', () => {
  let repo: IFrecuenciaRepository;

  const crearComposable = () =>
    useFrecuencias(new CrearFrecuenciaUseCase(repo), new GestionarFrecuenciasUseCase(repo));

  const idsDe = (frecuencias: readonly Frecuencia[]): (number | undefined)[] =>
    frecuencias.map((frecuencia) => frecuencia.id);

  beforeEach(() => {
    repo = crearFrecuenciaRepoMock();
  });

  it('debe iniciar con estado por defecto limpio', () => {
    const { loading, error, frecuencias, frecuenciaSeleccionada, total, frecuenciasActivas } = crearComposable();

    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(frecuencias.value).toEqual([]);
    expect(frecuenciaSeleccionada.value).toBeNull();
    expect(total.value).toBe(0);
    expect(frecuenciasActivas.value).toEqual([]);
  });

  it('debe inyectar los casos de uso en el orden (crear, gestionar)', async () => {
    const crear = new CrearFrecuenciaUseCase(repo);
    const gestionar = new GestionarFrecuenciasUseCase(repo);
    const ejecutarCrear = vi.spyOn(crear, 'execute');
    const listar = vi.spyOn(gestionar, 'listar').mockResolvedValue([]);
    vi.mocked(repo.crear).mockImplementation(async (frecuencia) => frecuencia);
    const { cargarFrecuencias, registrarFrecuencia } = useFrecuencias(crear, gestionar);

    await cargarFrecuencias();
    await registrarFrecuencia({
      cooperativaId: 1,
      ciudadOrigen: 'Quito',
      ciudadDestino: 'Ambato',
      horaSalida: '07:00',
      identificadorFrecuencia: 'FR-1',
    });

    expect(listar).toHaveBeenCalledTimes(1);
    expect(ejecutarCrear).toHaveBeenCalledTimes(1);
  });

  it('debe cargar las frecuencias y calcular total y activas', async () => {
    const inactiva = frecuenciaDePrueba(2);
    inactiva.desactivar();
    vi.mocked(repo.obtenerTodas).mockResolvedValue([frecuenciaDePrueba(1), inactiva]);
    const { loading, frecuencias, total, frecuenciasActivas, cargarFrecuencias } = crearComposable();

    const promesa = cargarFrecuencias({ cooperativaId: 1 });
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
    const { loading, error, frecuencias, cargarFrecuencias, limpiarError } = crearComposable();

    await expect(cargarFrecuencias()).rejects.toThrow('Sin conexión');

    expect(loading.value).toBe(false);
    expect(error.value).toBe('Sin conexión');
    expect(frecuencias.value).toEqual([]);

    limpiarError();
    expect(error.value).toBeNull();
  });

  it('debe usar un mensaje por defecto cuando el error no es una instancia de Error', async () => {
    vi.mocked(repo.obtenerTodas).mockRejectedValue('fallo de red');
    const { error, cargarFrecuencias } = crearComposable();

    await expect(cargarFrecuencias()).rejects.toBe('fallo de red');

    expect(error.value).toBe('Error al cargar las frecuencias');
  });

  it('debe limpiar el error anterior al iniciar una nueva operación', async () => {
    vi.mocked(repo.obtenerTodas).mockRejectedValueOnce(new Error('Falla')).mockResolvedValueOnce([]);
    const { error, cargarFrecuencias } = crearComposable();

    await expect(cargarFrecuencias()).rejects.toThrow();
    expect(error.value).toBe('Falla');

    await cargarFrecuencias();
    expect(error.value).toBeNull();
  });

  it('debe seleccionar una frecuencia y permitir limpiar la selección', async () => {
    vi.mocked(repo.obtenerPorId).mockResolvedValue(frecuenciaDePrueba(5));
    const { frecuenciaSeleccionada, seleccionarFrecuencia, limpiarSeleccion } = crearComposable();

    await seleccionarFrecuencia(5);
    expect(frecuenciaSeleccionada.value?.id).toBe(5);

    limpiarSeleccion();
    expect(frecuenciaSeleccionada.value).toBeNull();
  });

  it('debe reportar el error cuando la frecuencia a seleccionar no existe', async () => {
    vi.mocked(repo.obtenerPorId).mockResolvedValue(null);
    const { error, seleccionarFrecuencia } = crearComposable();

    await expect(seleccionarFrecuencia(9)).rejects.toThrow(FrecuenciaNoEncontradaException);

    expect(error.value).toContain('no encontrada');
  });

  it('debe registrar la frecuencia y agregarla a la lista', async () => {
    vi.mocked(repo.crear).mockImplementation(async (frecuencia) => {
      frecuencia.id = 77;
      return frecuencia;
    });
    const { frecuencias, registrarFrecuencia } = crearComposable();

    const nueva = await registrarFrecuencia({
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
    const { error, frecuencias, registrarFrecuencia } = crearComposable();

    await expect(
      registrarFrecuencia({
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
    const { frecuencias, frecuenciaSeleccionada, cargarFrecuencias, seleccionarFrecuencia, actualizarFrecuencia } =
      crearComposable();
    await cargarFrecuencias();
    await seleccionarFrecuencia(1);

    await actualizarFrecuencia(1, { horaSalida: '10:30' });

    expect(frecuencias.value.map((f) => f.horaSalida)).toEqual(['10:30', '09:00']);
    expect(frecuenciaSeleccionada.value?.horaSalida).toBe('10:30');
  });

  it('debe activar una frecuencia inactiva en la lista', async () => {
    const inactiva = frecuenciaDePrueba(1);
    inactiva.desactivar();
    vi.mocked(repo.obtenerTodas).mockResolvedValue([inactiva]);
    vi.mocked(repo.obtenerPorId).mockResolvedValue(inactiva);
    vi.mocked(repo.actualizar).mockResolvedValue(frecuenciaDePrueba(1));
    const { frecuenciasActivas, cargarFrecuencias, activarFrecuencia } = crearComposable();
    await cargarFrecuencias();
    expect(frecuenciasActivas.value).toHaveLength(0);

    await activarFrecuencia(1);

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
    const { frecuenciasActivas, cargarFrecuencias, desactivarFrecuencia } = crearComposable();
    await cargarFrecuencias();
    expect(frecuenciasActivas.value).toHaveLength(1);

    await desactivarFrecuencia(1);

    expect(repo.desactivar).toHaveBeenCalledWith(1);
    expect(frecuenciasActivas.value).toHaveLength(0);
  });

  it('debe reportar el error al desactivar una frecuencia inexistente', async () => {
    vi.mocked(repo.obtenerPorId).mockResolvedValue(null);
    const { error, desactivarFrecuencia } = crearComposable();

    await expect(desactivarFrecuencia(3)).rejects.toThrow(FrecuenciaNoEncontradaException);

    expect(error.value).toContain('no encontrada');
    expect(repo.desactivar).not.toHaveBeenCalled();
  });

  it('debe recargar la frecuencia al agregar una parada', async () => {
    const conParada = frecuenciaDePrueba(1);
    conParada.agregarParada(new ParadaIntermedia('Ambato', 3, 300));
    vi.mocked(repo.obtenerTodas).mockResolvedValue([frecuenciaDePrueba(1)]);
    vi.mocked(repo.agregarParada).mockImplementation(async (_id, parada) => parada);
    vi.mocked(repo.obtenerPorId).mockResolvedValue(conParada);
    const { frecuencias, cargarFrecuencias, agregarParadaAFrecuencia } = crearComposable();
    await cargarFrecuencias();

    await agregarParadaAFrecuencia(1, { ciudad: 'Ambato', orden: 3, minutosDesdeOrigen: 300 });

    expect(repo.agregarParada).toHaveBeenCalledWith(1, expect.any(ParadaIntermedia));
    expect(frecuencias.value[0].paradas).toHaveLength(3);
  });

  it('debe reportar el error y conservar la lista si la parada es inválida', async () => {
    vi.mocked(repo.obtenerTodas).mockResolvedValue([frecuenciaDePrueba(1)]);
    const { error, frecuencias, cargarFrecuencias, agregarParadaAFrecuencia } = crearComposable();
    await cargarFrecuencias();

    await expect(agregarParadaAFrecuencia(1, { ciudad: '', orden: 3, minutosDesdeOrigen: 300 })).rejects.toThrow();

    expect(error.value).toContain('parada');
    expect(frecuencias.value[0].paradas).toHaveLength(2);
    expect(repo.agregarParada).not.toHaveBeenCalled();
  });

  it('debe eliminar una parada y refrescar la frecuencia que la contiene', async () => {
    const original = frecuenciaDePrueba(1);
    original.paradas[1].id = 8;
    const sinParada = frecuenciaDePrueba(1);
    sinParada.establecerParadas([new ParadaIntermedia('Latacunga', 1, 120)]);
    vi.mocked(repo.obtenerTodas).mockResolvedValue([original]);
    vi.mocked(repo.obtenerPorId).mockResolvedValue(sinParada);
    const { frecuencias, cargarFrecuencias, eliminarParada } = crearComposable();
    await cargarFrecuencias();

    await eliminarParada(8);

    expect(repo.eliminarParada).toHaveBeenCalledWith(8);
    expect(repo.obtenerPorId).toHaveBeenCalledWith(1);
    expect(frecuencias.value[0].paradas).toHaveLength(1);
  });

  it('debe eliminar una parada desconocida sin recargar ninguna frecuencia', async () => {
    const { eliminarParada } = crearComposable();

    await eliminarParada(99);

    expect(repo.eliminarParada).toHaveBeenCalledWith(99);
    expect(repo.obtenerPorId).not.toHaveBeenCalled();
  });

  it('debe actualizar una parada y recargar su frecuencia', async () => {
    const original = frecuenciaDePrueba(1);
    original.establecerParadas([new ParadaIntermedia('Latacunga', 1, 120)]);
    original.paradas[0].id = 5;
    const editada = frecuenciaDePrueba(1);
    editada.establecerParadas([new ParadaIntermedia('Latacunga', 1, 150)]);
    vi.mocked(repo.obtenerTodas).mockResolvedValue([original]);
    vi.mocked(repo.obtenerPorId).mockResolvedValue(editada);
    const { frecuencias, cargarFrecuencias, actualizarParada } = crearComposable();
    await cargarFrecuencias();

    await actualizarParada(5, { minutosDesdeOrigen: 150 });

    expect(repo.actualizarParada).toHaveBeenCalledWith(5, { minutosDesdeOrigen: 150 });
    expect(frecuencias.value[0].paradas[0].minutosDesdeOrigen).toBe(150);
  });

  it('debe exponer el error si falla la actualización de una parada', async () => {
    vi.mocked(repo.actualizarParada).mockRejectedValue(new Error('Orden inconsistente'));
    const { error, actualizarParada } = crearComposable();

    await expect(actualizarParada(5, { orden: 2 })).rejects.toThrow('Orden inconsistente');
    expect(error.value).toBe('Orden inconsistente');
  });

  it('expone el error sin el prefijo técnico de la excepción de dominio', async () => {
    vi.mocked(repo.obtenerTodas).mockRejectedValue(new Error('[FrecuenciaException] Algo falló'));
    const { error, cargarFrecuencias } = crearComposable();

    await expect(cargarFrecuencias()).rejects.toThrow();

    expect(error.value).toBe('Algo falló');
  });

  describe('frecuencias con paradas y frecuencias directas', () => {
    const conParadas = (id: number, cantidad: number) => {
      const frecuencia = frecuenciaDePrueba(id);
      frecuencia.esDirecto = false;
      frecuencia.establecerParadas(
        Array.from({ length: cantidad }, (_, i) => {
          const parada = new ParadaIntermedia(`Ciudad${i}`, i + 1, 60 * (i + 1));
          parada.id = 100 + i;
          return parada;
        }),
      );
      return frecuencia;
    };

    it('al convertir en directa elimina todas sus paradas antes de guardar', async () => {
      const original = conParadas(1, 2);
      vi.mocked(repo.obtenerTodas).mockResolvedValue([original]);
      const guardada = frecuenciaDePrueba(1);
      guardada.esDirecto = true;
      guardada.establecerParadas([]);
      vi.mocked(repo.actualizar).mockResolvedValue(original);
      vi.mocked(repo.obtenerPorId).mockResolvedValue(guardada);
      const { cargarFrecuencias, guardarFrecuencia, frecuencias } = crearComposable();
      await cargarFrecuencias();

      await guardarFrecuencia(1, { esDirecto: true });

      expect(repo.eliminarParada).toHaveBeenCalledTimes(2);
      expect(repo.eliminarParada).toHaveBeenCalledWith(100);
      expect(repo.eliminarParada).toHaveBeenCalledWith(101);
      expect(repo.actualizar).toHaveBeenCalledWith(1, { esDirecto: true });
      expect(frecuencias.value[0].esDirecto).toBe(true);
      expect(repo.desactivar).not.toHaveBeenCalled();
    });

    it('si el guardado como directa falla, no elimina ninguna parada', async () => {
      const original = conParadas(1, 2);
      vi.mocked(repo.obtenerTodas).mockResolvedValue([original]);
      vi.mocked(repo.actualizar).mockRejectedValue(new Error('Sin conexión'));
      const { cargarFrecuencias, guardarFrecuencia, frecuencias } = crearComposable();
      await cargarFrecuencias();

      await expect(guardarFrecuencia(1, { esDirecto: true })).rejects.toThrow('Sin conexión');

      expect(repo.eliminarParada).not.toHaveBeenCalled();
      expect(frecuencias.value[0].paradas).toHaveLength(2);
    });

    it('al guardar sin convertir en directa no toca las paradas', async () => {
      const original = conParadas(1, 2);
      vi.mocked(repo.obtenerTodas).mockResolvedValue([original]);
      vi.mocked(repo.actualizar).mockResolvedValue(original);
      const { cargarFrecuencias, guardarFrecuencia } = crearComposable();
      await cargarFrecuencias();

      await guardarFrecuencia(1, { horaSalida: '09:00' });

      expect(repo.eliminarParada).not.toHaveBeenCalled();
    });

    it('si el guardado deja una frecuencia activa incompleta, la desactiva', async () => {
      const original = frecuenciaDePrueba(1);
      vi.mocked(repo.obtenerTodas).mockResolvedValue([original]);
      const incompleta = frecuenciaDePrueba(1);
      incompleta.esDirecto = false;
      incompleta.establecerParadas([]);
      const desactivada = frecuenciaDePrueba(1);
      desactivada.esDirecto = false;
      desactivada.establecerParadas([]);
      desactivada.desactivar();
      vi.mocked(repo.actualizar).mockResolvedValue(incompleta);
      vi.mocked(repo.obtenerPorId).mockResolvedValue(desactivada);
      const { cargarFrecuencias, guardarFrecuencia, frecuencias } = crearComposable();
      await cargarFrecuencias();

      await guardarFrecuencia(1, { esDirecto: false });

      expect(repo.desactivar).toHaveBeenCalledWith(1);
      expect(frecuencias.value[0].activa).toBe(false);
    });

    it('al eliminar la última parada de una frecuencia con paradas activa, la desactiva', async () => {
      const original = conParadas(1, 1);
      vi.mocked(repo.obtenerTodas).mockResolvedValue([original]);
      const sinParadas = conParadas(1, 0);
      const sinParadasInactiva = conParadas(1, 0);
      sinParadasInactiva.desactivar();
      // recargar -> desactivar (comprueba que exista) -> recargar
      vi.mocked(repo.obtenerPorId)
        .mockResolvedValueOnce(sinParadas)
        .mockResolvedValueOnce(sinParadas)
        .mockResolvedValueOnce(sinParadasInactiva);
      const { cargarFrecuencias, eliminarParada, frecuencias } = crearComposable();
      await cargarFrecuencias();

      await eliminarParada(100);

      expect(repo.eliminarParada).toHaveBeenCalledWith(100);
      expect(repo.desactivar).toHaveBeenCalledWith(1);
      expect(frecuencias.value[0].activa).toBe(false);
    });

    it('al eliminar una parada y quedar otras, no desactiva la frecuencia', async () => {
      const original = conParadas(1, 2);
      vi.mocked(repo.obtenerTodas).mockResolvedValue([original]);
      vi.mocked(repo.obtenerPorId).mockResolvedValue(conParadas(1, 1));
      const { cargarFrecuencias, eliminarParada } = crearComposable();
      await cargarFrecuencias();

      await eliminarParada(101);

      expect(repo.desactivar).not.toHaveBeenCalled();
    });
  });

  describe('resumen y filtros de la barra de búsqueda', () => {
    it('expone el resumen para las tarjetas de métricas', async () => {
      const inactiva = frecuenciaDePrueba(2);
      inactiva.desactivar();
      vi.mocked(repo.obtenerTodas).mockResolvedValue([frecuenciaDePrueba(1), inactiva]);
      const { resumen, cargarFrecuencias } = crearComposable();
      expect(resumen.value).toEqual({ total: 0, activas: 0, inactivas: 0, conParadas: 0 });

      await cargarFrecuencias();

      expect(resumen.value).toEqual({ total: 2, activas: 1, inactivas: 1, conParadas: 2 });
    });

    it('filtra las filas por texto y por estado, y permite reiniciar los filtros', async () => {
      const otra = frecuenciaDePrueba(2);
      otra.ciudadOrigen = 'Guayaquil';
      otra.ciudadDestino = 'Machala';
      otra.desactivar();
      vi.mocked(repo.obtenerTodas).mockResolvedValue([frecuenciaDePrueba(1), otra]);
      const { filasFiltradas, busqueda, filtroEstado, reiniciarFiltros, cargarFrecuencias } = crearComposable();
      await cargarFrecuencias();
      expect(filasFiltradas.value).toHaveLength(2);

      busqueda.value = 'machala';
      expect(filasFiltradas.value.map((fila) => fila.id)).toEqual([2]);

      filtroEstado.value = 'Activas';
      expect(filasFiltradas.value).toEqual([]);

      reiniciarFiltros();
      expect(busqueda.value).toBe('');
      expect(filtroEstado.value).toBe('Todas');
      expect(filasFiltradas.value).toHaveLength(2);
    });
  });

  describe('edición de frecuencias', () => {
    it('obtiene los datos de edición de una frecuencia ya cargada', async () => {
      vi.mocked(repo.obtenerTodas).mockResolvedValue([frecuenciaDePrueba(1, '08:30'), frecuenciaDePrueba(2, '09:00')]);
      const { obtenerDatosEdicion, cargarFrecuencias } = crearComposable();
      expect(obtenerDatosEdicion(2)).toBeNull();

      await cargarFrecuencias();

      expect(obtenerDatosEdicion(2)).toMatchObject({ horaSalida: '09:00', ciudadOrigen: expect.any(String) });
      expect(obtenerDatosEdicion(99)).toBeNull();
    });

    it('al guardar los cambios reemplaza la frecuencia en la lista sin recargar', async () => {
      const original = frecuenciaDePrueba(1, '08:30');
      vi.mocked(repo.obtenerTodas).mockResolvedValue([original]);
      vi.mocked(repo.obtenerPorId).mockResolvedValue(original);
      const editada = frecuenciaDePrueba(1, '10:15');
      vi.mocked(repo.actualizar).mockResolvedValue(editada);
      const { frecuencias, cargarFrecuencias, actualizarFrecuencia } = crearComposable();
      await cargarFrecuencias();

      await actualizarFrecuencia(1, { horaSalida: '10:15' });

      expect(repo.actualizar).toHaveBeenCalledWith(1, { horaSalida: '10:15' });
      expect(frecuencias.value[0].horaSalida).toBe('10:15');
    });
  });

  describe('modelos de presentación', () => {
    it('debe exponer filas ya formateadas de las frecuencias cargadas', async () => {
      vi.mocked(repo.obtenerTodas).mockResolvedValue([frecuenciaDePrueba(1, '08:00'), frecuenciaDePrueba(2, '09:30')]);
      const { filasFrecuencias, cargarFrecuencias } = crearComposable();
      expect(filasFrecuencias.value).toEqual([]);

      await cargarFrecuencias();

      expect(filasFrecuencias.value.map((fila) => fila.horaSalida)).toEqual(['08:00', '09:30']);
      expect(filasFrecuencias.value[0]).toMatchObject({
        ruta: 'Quito → Cuenca',
        dias: 'Todos los días',
        totalParadas: 2,
        tiempoUltimaParada: '4 h',
      });
    });

    it('debe exponer la fila, las paradas ordenadas y el orden sugerido de la frecuencia seleccionada', async () => {
      const seleccionada = frecuenciaDePrueba(5);
      seleccionada.establecerParadas([new ParadaIntermedia('Riobamba', 2, 240), new ParadaIntermedia('Latacunga', 1, 90)]);
      vi.mocked(repo.obtenerPorId).mockResolvedValue(seleccionada);
      const { filaSeleccionada, paradasSeleccionadas, ordenSugeridoParada, seleccionarFrecuencia, limpiarSeleccion } =
        crearComposable();
      expect(filaSeleccionada.value).toBeNull();
      expect(paradasSeleccionadas.value).toEqual([]);
      expect(ordenSugeridoParada.value).toBe(1);

      await seleccionarFrecuencia(5);

      expect(filaSeleccionada.value?.id).toBe(5);
      expect(paradasSeleccionadas.value.map((parada) => parada.ciudad)).toEqual(['Latacunga', 'Riobamba']);
      expect(paradasSeleccionadas.value[0].tiempo).toBe('1 h 30 min');
      expect(ordenSugeridoParada.value).toBe(3);

      limpiarSeleccion();
      expect(filaSeleccionada.value).toBeNull();
      expect(paradasSeleccionadas.value).toEqual([]);
    });
  });
});
