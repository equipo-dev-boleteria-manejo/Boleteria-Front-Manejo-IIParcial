/**
 * useRutas.ts - Composable Reactivo para Gestión Operativa de Rutas
 *
 * Arquitectura:
 * - Capa de Presentación Desacoplada (Headless).
 * - Reactividad pura (refs, computeds, loading, error, success).
 * - Cero lógica de negocio directa: orquesta el caso de uso GestionarViajeRuta.
 * - Soporta inyección de dependencias (DIP).
 */

import { ref, computed, watch } from 'vue';
import type { Ruta } from '../../Domain/Entities/Ruta';
import type { Bus } from '../../Domain/Entities/Bus';
import type { Frecuencia } from '../../Domain/Entities/Frecuencia';
import { EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import type { IRutaRepository, RutaFiltros } from '../../Domain/Repositories/IRutaRepository';
import type { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import {
  GestionarViajeRuta,
  gestionarViajeRutaUseCase as defaultGestionarViaje,
} from '../../Application/UseCases/GestionarViajeRuta';
import { SupabaseRutaRepository } from '../../Infrastructure/Repositories/SupabaseRutaRepository';
import { SupabaseBusRepository } from '../../Infrastructure/Repositories/SupabaseBusRepository';
import { SupabaseFrecuenciaRepository } from '../../Infrastructure/Repositories/SupabaseFrecuenciaRepository';
import { mensajeErrorParaUsuario } from '../Utils/errorMessage';

export interface RutaFilaPresentacion {
  ruta: Ruta;
  trayectoEtiqueta: string;
  busEtiqueta: string;
}

export function useRutas(
  rutaRepo: IRutaRepository = new SupabaseRutaRepository(),
  busRepo: IBusRepository = new SupabaseBusRepository(),
  frecuenciaRepo: IFrecuenciaRepository = new SupabaseFrecuenciaRepository(),
  gestionarViajeUseCase?: GestionarViajeRuta,
) {
  const viajeUseCase = gestionarViajeUseCase || new GestionarViajeRuta(rutaRepo);

  const rutas = ref<Ruta[]>([]);
  const buses = ref<Bus[]>([]);
  const frecuencias = ref<Frecuencia[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const success = ref<string | null>(null);

  const filtroEstado = ref<string>('Todas');
  const filtroFecha = ref<string>('');
  const filtroTexto = ref('');
  const paginaActual = ref(1);
  const itemsPorPagina = 8;

  const rutasFiltradas = computed(() => {
    const consulta = filtroTexto.value.trim().toLocaleLowerCase();

    return rutas.value.filter((ruta) => {
      const coincideEstado =
        filtroEstado.value === 'Todas' || ruta.estado === filtroEstado.value;
      const coincideFecha =
        !filtroFecha.value || ruta.fecha === filtroFecha.value;
      const coincideTexto =
        !consulta ||
        obtenerRutaTrayecto(ruta).toLocaleLowerCase().includes(consulta) ||
        obtenerBusEtiqueta(ruta.busId).toLocaleLowerCase().includes(consulta) ||
        (ruta.choferId || '').toLocaleLowerCase().includes(consulta);
      return coincideEstado && coincideFecha && coincideTexto;
    });
  });

  const totalFiltradas = computed(() => rutasFiltradas.value.length);
  const totalPaginas = computed(() =>
    Math.max(1, Math.ceil(totalFiltradas.value / itemsPorPagina))
  );
  const rutasPaginadas = computed<RutaFilaPresentacion[]>(() => {
    const inicio = (paginaActual.value - 1) * itemsPorPagina;
    return rutasFiltradas.value
      .slice(inicio, inicio + itemsPorPagina)
      .map((ruta) => ({
        ruta,
        trayectoEtiqueta: obtenerRutaTrayecto(ruta),
        busEtiqueta: obtenerBusEtiqueta(ruta.busId),
      }));
  });

  watch([filtroEstado, filtroFecha, filtroTexto], () => {
    paginaActual.value = 1;
  });

  const rutasProgramadas = computed(() =>
    rutas.value.filter((r) => r.estado === EstadoRuta.PROGRAMADA)
  );

  const rutasEnCurso = computed(() =>
    rutas.value.filter((r) => r.estado === EstadoRuta.EN_CURSO)
  );

  const rutasFinalizadas = computed(() =>
    rutas.value.filter((r) => r.estado === EstadoRuta.FINALIZADA)
  );

  async function cargarRutas(filtros?: RutaFiltros): Promise<Ruta[]> {
    loading.value = true;
    error.value = null;

    try {
      const lista = await viajeUseCase.obtenerRutas(filtros);
      rutas.value = lista;
      return lista;
    } catch (err: unknown) {
      error.value = mensajeErrorParaUsuario(err, 'Error al cargar las rutas.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function cargarBuses(cooperativaId?: number): Promise<Bus[]> {
    loading.value = true;
    error.value = null;

    try {
      const lista = cooperativaId
        ? await busRepo.obtenerPorCooperativa(cooperativaId)
        : await busRepo.obtenerTodos();
      buses.value = lista;
      return lista;
    } catch (err: unknown) {
      error.value = mensajeErrorParaUsuario(err, 'Error al cargar los buses.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function cargarFrecuencias(cooperativaId?: number): Promise<Frecuencia[]> {
    loading.value = true;
    error.value = null;

    try {
      const lista = cooperativaId
        ? await frecuenciaRepo.obtenerPorCooperativa(cooperativaId)
        : await frecuenciaRepo.obtenerTodas();
      frecuencias.value = lista;
      return lista;
    } catch (err: unknown) {
      error.value = mensajeErrorParaUsuario(err, 'Error al cargar las frecuencias.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function cambiarEstado(rutaId: number, nuevoEstado: EstadoRuta): Promise<Ruta> {
    loading.value = true;
    error.value = null;
    success.value = null;

    try {
      const actualizada = await viajeUseCase.cambiarEstado(rutaId, nuevoEstado);
      const index = rutas.value.findIndex((r) => r.id === rutaId);
      if (index !== -1) {
        rutas.value[index] = actualizada;
      }
      success.value = `Estado de ruta actualizado a ${nuevoEstado}.`;
      return actualizada;
    } catch (err: unknown) {
      error.value = mensajeErrorParaUsuario(err, 'Error al cambiar estado de la ruta.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function iniciarViaje(rutaId: number): Promise<Ruta> {
    loading.value = true;
    error.value = null;
    success.value = null;

    try {
      const actualizada = await viajeUseCase.iniciarViaje(rutaId);
      const index = rutas.value.findIndex((r) => r.id === rutaId);
      if (index !== -1) {
        rutas.value[index] = actualizada;
      }
      success.value = 'Estado de ruta actualizado a En Curso.';
      return actualizada;
    } catch (err: unknown) {
      error.value = mensajeErrorParaUsuario(err, 'Error al iniciar viaje.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function finalizarViaje(rutaId: number): Promise<Ruta> {
    loading.value = true;
    error.value = null;
    success.value = null;

    try {
      const actualizada = await viajeUseCase.finalizarViaje(rutaId);
      const index = rutas.value.findIndex((r) => r.id === rutaId);
      if (index !== -1) {
        rutas.value[index] = actualizada;
      }
      success.value = 'Estado de ruta actualizado a Finalizada.';
      return actualizada;
    } catch (err: unknown) {
      error.value = mensajeErrorParaUsuario(err, 'Error al finalizar viaje.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function cancelarViaje(rutaId: number, motivo?: string): Promise<Ruta> {
    loading.value = true;
    error.value = null;
    success.value = null;

    try {
      const actualizada = await viajeUseCase.cancelarViaje(rutaId, motivo);
      const index = rutas.value.findIndex((r) => r.id === rutaId);
      if (index !== -1) {
        rutas.value[index] = actualizada;
      }
      success.value = 'Viaje cancelado correctamente.';
      return actualizada;
    } catch (err: unknown) {
      error.value = mensajeErrorParaUsuario(err, 'Error al cancelar viaje.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function asignarChofer(rutaId: number, choferId: string): Promise<Ruta> {
    loading.value = true;
    error.value = null;
    success.value = null;

    try {
      const actualizada = await viajeUseCase.asignarChofer(rutaId, choferId);
      const index = rutas.value.findIndex((r) => r.id === rutaId);
      if (index !== -1) {
        rutas.value[index] = actualizada;
      }
      success.value = 'Chofer asignado correctamente.';
      return actualizada;
    } catch (err: unknown) {
      error.value = mensajeErrorParaUsuario(err, 'Error al asignar chofer a la ruta.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function eliminarRuta(rutaId: number): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await viajeUseCase.eliminarRuta(rutaId);
      rutas.value = rutas.value.filter((r) => r.id !== rutaId);
      success.value = 'Ruta eliminada correctamente.';
    } catch (err: unknown) {
      error.value = mensajeErrorParaUsuario(err, 'Error al eliminar la ruta.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function limpiar(): void {
    rutas.value = [];
    buses.value = [];
    frecuencias.value = [];
    loading.value = false;
    error.value = null;
    success.value = null;
    filtroEstado.value = 'Todas';
    filtroFecha.value = '';
    filtroTexto.value = '';
    paginaActual.value = 1;
  }

  function obtenerRutaTrayecto(ruta: Ruta): string {
    const frecuencia = frecuencias.value.find((item) => item.id === ruta.frecuenciaId);
    return frecuencia
      ? `${frecuencia.ciudadOrigen} → ${frecuencia.ciudadDestino}`
      : `Frecuencia #${ruta.frecuenciaId}`;
  }

  function obtenerBusEtiqueta(busId: number): string {
    const bus = buses.value.find((item) => item.id === busId);
    return bus ? `Bus #${bus.numero} (${bus.placa})` : `Unidad #${busId}`;
  }

  return {
    rutas,
    buses,
    frecuencias,
    loading,
    error,
    success,
    filtroEstado,
    filtroFecha,
    filtroTexto,
    paginaActual,
    itemsPorPagina,
    totalFiltradas,
    totalPaginas,
    rutasFiltradas,
    rutasPaginadas,
    rutasProgramadas,
    rutasEnCurso,
    rutasFinalizadas,
    cargarRutas,
    cargarBuses,
    cargarFrecuencias,
    cambiarEstado,
    iniciarViaje,
    finalizarViaje,
    cancelarViaje,
    asignarChofer,
    eliminarRuta,
    limpiar,
  };
}
