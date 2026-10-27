/**
 * useFrecuencias.ts - Composable de gestión de frecuencias y paradas
 *
 * Arquitectura:
 * - Lógica de presentación reactiva desacoplada (Headless).
 * - No contiene HTML, CSS ni acoplamiento a vistas específicas.
 * - Gestiona el estado reactivo (loading, error, frecuencias) y orquesta los casos de uso.
 * - Las entidades se guardan en shallowRef y la lista se reemplaza de forma inmutable.
 */

import { computed, ref, shallowRef } from 'vue';
import type { DiaOperacion, Frecuencia } from '../../Domain/Entities/Frecuencia';
import type { FrecuenciaFiltros } from '../../Domain/Repositories/IFrecuenciaRepository';
import type {
  ActualizarFrecuenciaDto,
  CrearFrecuenciaDto,
  ParadaIntermediaDto,
} from '../../Application/Dtos/CrearFrecuenciaDto';
import {
  CrearFrecuenciaUseCase,
  crearFrecuenciaUseCase as defaultCrearUseCase,
} from '../../Application/UseCases/CrearFrecuencia';
import {
  GestionarFrecuenciasUseCase,
  gestionarFrecuenciasUseCase as defaultGestionarUseCase,
} from '../../Application/UseCases/GestionarFrecuencias';
import {
  aFilaFrecuencia,
  aFilaParada,
  siguienteOrdenParada,
  type FilaFrecuencia,
  type FilaParada,
} from './presentacionFrecuencias';

export type { FilaFrecuencia, FilaParada };

export function useFrecuencias(
  crearUseCase: CrearFrecuenciaUseCase = defaultCrearUseCase,
  gestionarUseCase: GestionarFrecuenciasUseCase = defaultGestionarUseCase,
) {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const frecuencias = shallowRef<Frecuencia[]>([]);
  const frecuenciaSeleccionada = shallowRef<Frecuencia | null>(null);

  const total = computed(() => frecuencias.value.length);
  const frecuenciasActivas = computed(() => frecuencias.value.filter((frecuencia) => frecuencia.activa));

  // Modelos de presentación: las vistas renderizan estos datos ya formateados.
  const filasFrecuencias = computed<FilaFrecuencia[]>(() => frecuencias.value.map(aFilaFrecuencia));
  const filaSeleccionada = computed<FilaFrecuencia | null>(() =>
    frecuenciaSeleccionada.value ? aFilaFrecuencia(frecuenciaSeleccionada.value) : null,
  );
  const paradasSeleccionadas = computed<FilaParada[]>(() =>
    frecuenciaSeleccionada.value
      ? frecuenciaSeleccionada.value.obtenerParadasOrdenadas().map(aFilaParada)
      : [],
  );
  const ordenSugeridoParada = computed(() => siguienteOrdenParada(frecuenciaSeleccionada.value));

  /**
   * Ejecuta una acción del caso de uso gestionando loading y error de forma uniforme.
   */
  async function ejecutar<T>(accion: () => Promise<T>, mensajePorDefecto: string): Promise<T> {
    loading.value = true;
    error.value = null;

    try {
      return await accion();
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : mensajePorDefecto;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /** Reemplaza en la lista (y en la selección) la frecuencia con el mismo ID. */
  function reemplazar(actualizada: Frecuencia): void {
    frecuencias.value = frecuencias.value.map((frecuencia) =>
      frecuencia.id === actualizada.id ? actualizada : frecuencia,
    );
    if (frecuenciaSeleccionada.value?.id === actualizada.id) {
      frecuenciaSeleccionada.value = actualizada;
    }
  }

  async function recargar(frecuenciaId: number): Promise<Frecuencia> {
    const actualizada = await gestionarUseCase.obtenerPorId(frecuenciaId);
    reemplazar(actualizada);
    return actualizada;
  }

  /** Busca, entre las frecuencias cargadas, a cuál pertenece una parada. */
  function frecuenciaIdDeParada(paradaId: number): number | undefined {
    const cargadas = frecuenciaSeleccionada.value
      ? [...frecuencias.value, frecuenciaSeleccionada.value]
      : frecuencias.value;

    return cargadas.find((frecuencia) => frecuencia.paradas.some((parada) => parada.id === paradaId))?.id;
  }

  async function cargarFrecuencias(filtros?: FrecuenciaFiltros): Promise<Frecuencia[]> {
    return ejecutar(async () => {
      frecuencias.value = await gestionarUseCase.listar(filtros);
      return frecuencias.value;
    }, 'Error al cargar las frecuencias');
  }

  async function cargarPorCooperativa(cooperativaId: number): Promise<Frecuencia[]> {
    return ejecutar(async () => {
      frecuencias.value = await gestionarUseCase.obtenerPorCooperativa(cooperativaId);
      return frecuencias.value;
    }, 'Error al cargar las frecuencias de la cooperativa');
  }

  async function buscarPorTramo(origen: string, destino: string, dia?: DiaOperacion): Promise<Frecuencia[]> {
    return ejecutar(async () => {
      frecuencias.value = await gestionarUseCase.buscarPorTramo(origen, destino, dia);
      return frecuencias.value;
    }, 'Error al buscar frecuencias');
  }

  async function seleccionarFrecuencia(id: number): Promise<Frecuencia> {
    return ejecutar(async () => {
      frecuenciaSeleccionada.value = await gestionarUseCase.obtenerPorId(id);
      return frecuenciaSeleccionada.value;
    }, 'Error al obtener la frecuencia');
  }

  function limpiarSeleccion(): void {
    frecuenciaSeleccionada.value = null;
  }

  async function registrarFrecuencia(dto: CrearFrecuenciaDto): Promise<Frecuencia> {
    return ejecutar(async () => {
      const nueva = await crearUseCase.execute(dto);
      frecuencias.value = [...frecuencias.value, nueva];
      return nueva;
    }, 'Error al registrar la frecuencia');
  }

  async function actualizarFrecuencia(id: number, cambios: ActualizarFrecuenciaDto): Promise<Frecuencia> {
    return ejecutar(async () => {
      const actualizada = await gestionarUseCase.actualizar(id, cambios);
      reemplazar(actualizada);
      return actualizada;
    }, 'Error al actualizar la frecuencia');
  }

  async function activarFrecuencia(id: number): Promise<Frecuencia> {
    return ejecutar(async () => {
      const actualizada = await gestionarUseCase.activar(id);
      reemplazar(actualizada);
      return actualizada;
    }, 'Error al activar la frecuencia');
  }

  async function desactivarFrecuencia(id: number): Promise<void> {
    await ejecutar(async () => {
      await gestionarUseCase.desactivar(id);
      await recargar(id);
    }, 'Error al desactivar la frecuencia');
  }

  async function agregarParadaAFrecuencia(frecuenciaId: number, dto: ParadaIntermediaDto): Promise<Frecuencia> {
    return ejecutar(async () => {
      await gestionarUseCase.agregarParada(frecuenciaId, dto);
      return recargar(frecuenciaId);
    }, 'Error al agregar la parada');
  }

  /**
   * Elimina una parada. Si la parada pertenece a una frecuencia ya cargada,
   * refresca esa frecuencia para reflejar el cambio.
   */
  async function eliminarParada(paradaId: number): Promise<void> {
    await ejecutar(async () => {
      const frecuenciaId = frecuenciaIdDeParada(paradaId);
      await gestionarUseCase.eliminarParada(paradaId);
      if (frecuenciaId !== undefined) {
        await recargar(frecuenciaId);
      }
    }, 'Error al eliminar la parada');
  }

  function limpiarError(): void {
    error.value = null;
  }

  return {
    loading,
    error,
    frecuencias,
    frecuenciaSeleccionada,
    total,
    frecuenciasActivas,
    filasFrecuencias,
    filaSeleccionada,
    paradasSeleccionadas,
    ordenSugeridoParada,
    cargarFrecuencias,
    cargarPorCooperativa,
    buscarPorTramo,
    seleccionarFrecuencia,
    limpiarSeleccion,
    registrarFrecuencia,
    actualizarFrecuencia,
    activarFrecuencia,
    desactivarFrecuencia,
    agregarParadaAFrecuencia,
    eliminarParada,
    limpiarError,
  };
}
