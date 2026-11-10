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
  aDatosEdicion,
  aFilaFrecuencia,
  aFilaParada,
  filtrarFilas,
  mensajeLegible,
  resumirFrecuencias,
  siguienteOrdenParada,
  type DatosEdicionFrecuencia,
  type FilaFrecuencia,
  type FilaParada,
  type FiltroEstado,
  type ResumenFrecuencias,
} from './presentacionFrecuencias';

export type { FilaFrecuencia, FilaParada, FiltroEstado, ResumenFrecuencias };

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

  // Cifras para las tarjetas de métricas y filtros de la barra de búsqueda.
  const resumen = computed<ResumenFrecuencias>(() => resumirFrecuencias(frecuencias.value));
  const busqueda = ref('');
  const filtroEstado = ref<FiltroEstado>('Todas');
  const filasFiltradas = computed<FilaFrecuencia[]>(() =>
    filtrarFilas(filasFrecuencias.value, busqueda.value, filtroEstado.value),
  );

  function reiniciarFiltros(): void {
    busqueda.value = '';
    filtroEstado.value = 'Todas';
  }

  /**
   * Ejecuta una acción del caso de uso gestionando loading y error de forma uniforme.
   */
  async function ejecutar<T>(accion: () => Promise<T>, mensajePorDefecto: string): Promise<T> {
    loading.value = true;
    error.value = null;

    try {
      return await accion();
    } catch (err: unknown) {
      error.value = err instanceof Error ? mensajeLegible(err.message) || mensajePorDefecto : mensajePorDefecto;
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

  /**
   * Guarda los cambios de una frecuencia aplicando sus reglas:
   * - Si pasa a directa, se eliminan sus paradas (una directa no las lleva). Primero se guarda el cambio y
   *   después se eliminan las paradas: si el guardado falla, la frecuencia conserva sus paradas intactas.
   * - Si queda incompleta (con paradas, pero sin ninguna) y estaba activa, se desactiva.
   */
  async function guardarFrecuencia(id: number, cambios: ActualizarFrecuenciaDto): Promise<Frecuencia> {
    return ejecutar(async () => {
      const actual = frecuencias.value.find((frecuencia) => frecuencia.id === id);
      let guardada = await gestionarUseCase.actualizar(id, cambios);

      if (cambios.esDirecto === true && actual && actual.paradas.length > 0) {
        for (const parada of actual.paradas) {
          if (parada.id !== undefined) await gestionarUseCase.eliminarParada(parada.id);
        }
        guardada = await gestionarUseCase.obtenerPorId(id);
      }

      if (guardada.estaIncompleta() && guardada.activa) {
        await gestionarUseCase.desactivar(id);
        guardada = await gestionarUseCase.obtenerPorId(id);
      }
      reemplazar(guardada);
      return guardada;
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

  /** Modifica una parada y refresca su frecuencia para reflejar el cambio. */
  async function actualizarParada(paradaId: number, cambios: Partial<ParadaIntermediaDto>): Promise<void> {
    await ejecutar(async () => {
      const frecuenciaId = frecuenciaIdDeParada(paradaId);
      await gestionarUseCase.actualizarParada(paradaId, cambios);
      if (frecuenciaId !== undefined) {
        await recargar(frecuenciaId);
      }
    }, 'Error al actualizar la parada');
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
        const restante = await recargar(frecuenciaId);
        // Al quedarse sin paradas, una frecuencia con paradas deja de operar hasta completarse.
        if (restante.estaIncompleta() && restante.activa) {
          await gestionarUseCase.desactivar(frecuenciaId);
          await recargar(frecuenciaId);
        }
      }
    }, 'Error al eliminar la parada');
  }

  /** Datos de una frecuencia ya cargada, listos para precargar el formulario de edición. */
  function obtenerDatosEdicion(id: number): DatosEdicionFrecuencia | null {
    const frecuencia = frecuencias.value.find((item) => item.id === id);
    return frecuencia ? aDatosEdicion(frecuencia) : null;
  }

  function limpiarError(): void {
    error.value = null;
  }

  return {
    obtenerDatosEdicion,
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
    resumen,
    busqueda,
    filtroEstado,
    filasFiltradas,
    reiniciarFiltros,
    cargarFrecuencias,
    cargarPorCooperativa,
    buscarPorTramo,
    seleccionarFrecuencia,
    limpiarSeleccion,
    registrarFrecuencia,
    actualizarFrecuencia,
    guardarFrecuencia,
    activarFrecuencia,
    desactivarFrecuencia,
    agregarParadaAFrecuencia,
    actualizarParada,
    eliminarParada,
    limpiarError,
  };
}
