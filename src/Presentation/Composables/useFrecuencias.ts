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
  crearFrecuenciaUseCase as defaultCrear,
} from '../../Application/UseCases/CrearFrecuencia';
import {
  GestionarFrecuenciasUseCase,
  gestionarFrecuenciasUseCase as defaultGestionar,
} from '../../Application/UseCases/GestionarFrecuencias';

export function useFrecuencias(
  gestionar: GestionarFrecuenciasUseCase = defaultGestionar,
  crear: CrearFrecuenciaUseCase = defaultCrear,
) {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const frecuencias = shallowRef<Frecuencia[]>([]);
  const seleccionada = shallowRef<Frecuencia | null>(null);

  const total = computed(() => frecuencias.value.length);
  const frecuenciasActivas = computed(() => frecuencias.value.filter((frecuencia) => frecuencia.activa));

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
    if (seleccionada.value?.id === actualizada.id) {
      seleccionada.value = actualizada;
    }
  }

  async function recargar(frecuenciaId: number): Promise<Frecuencia> {
    const actualizada = await gestionar.obtenerPorId(frecuenciaId);
    reemplazar(actualizada);
    return actualizada;
  }

  async function cargar(filtros?: FrecuenciaFiltros): Promise<Frecuencia[]> {
    return ejecutar(async () => {
      frecuencias.value = await gestionar.listar(filtros);
      return frecuencias.value;
    }, 'Error al cargar las frecuencias');
  }

  async function cargarPorCooperativa(cooperativaId: number): Promise<Frecuencia[]> {
    return ejecutar(async () => {
      frecuencias.value = await gestionar.obtenerPorCooperativa(cooperativaId);
      return frecuencias.value;
    }, 'Error al cargar las frecuencias de la cooperativa');
  }

  async function buscarPorTramo(origen: string, destino: string, dia?: DiaOperacion): Promise<Frecuencia[]> {
    return ejecutar(async () => {
      frecuencias.value = await gestionar.buscarPorTramo(origen, destino, dia);
      return frecuencias.value;
    }, 'Error al buscar frecuencias');
  }

  async function seleccionar(id: number): Promise<Frecuencia> {
    return ejecutar(async () => {
      seleccionada.value = await gestionar.obtenerPorId(id);
      return seleccionada.value;
    }, 'Error al obtener la frecuencia');
  }

  function limpiarSeleccion(): void {
    seleccionada.value = null;
  }

  async function crearFrecuencia(dto: CrearFrecuenciaDto): Promise<Frecuencia> {
    return ejecutar(async () => {
      const nueva = await crear.execute(dto);
      frecuencias.value = [...frecuencias.value, nueva];
      return nueva;
    }, 'Error al crear la frecuencia');
  }

  async function actualizar(id: number, cambios: ActualizarFrecuenciaDto): Promise<Frecuencia> {
    return ejecutar(async () => {
      const actualizada = await gestionar.actualizar(id, cambios);
      reemplazar(actualizada);
      return actualizada;
    }, 'Error al actualizar la frecuencia');
  }

  async function activar(id: number): Promise<Frecuencia> {
    return ejecutar(async () => {
      const actualizada = await gestionar.activar(id);
      reemplazar(actualizada);
      return actualizada;
    }, 'Error al activar la frecuencia');
  }

  async function desactivar(id: number): Promise<void> {
    await ejecutar(async () => {
      await gestionar.desactivar(id);
      await recargar(id);
    }, 'Error al desactivar la frecuencia');
  }

  async function agregarParada(frecuenciaId: number, dto: ParadaIntermediaDto): Promise<Frecuencia> {
    return ejecutar(async () => {
      await gestionar.agregarParada(frecuenciaId, dto);
      return recargar(frecuenciaId);
    }, 'Error al agregar la parada');
  }

  async function eliminarParada(frecuenciaId: number, paradaId: number): Promise<Frecuencia> {
    return ejecutar(async () => {
      await gestionar.eliminarParada(paradaId);
      return recargar(frecuenciaId);
    }, 'Error al eliminar la parada');
  }

  function limpiarError(): void {
    error.value = null;
  }

  return {
    loading,
    error,
    frecuencias,
    seleccionada,
    total,
    frecuenciasActivas,
    cargar,
    cargarPorCooperativa,
    buscarPorTramo,
    seleccionar,
    limpiarSeleccion,
    crearFrecuencia,
    actualizar,
    activar,
    desactivar,
    agregarParada,
    eliminarParada,
    limpiarError,
  };
}
