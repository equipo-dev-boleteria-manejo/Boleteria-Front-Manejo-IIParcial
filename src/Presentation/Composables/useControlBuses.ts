/**
 * useControlBuses.ts - Composable Headless para el control operativo de la flota.
 *
 * Arquitectura:
 * - No importa Supabase ni ejecuta consultas SQL.
 * - Consume exclusivamente casos de uso de la capa de Aplicación.
 * - La disponibilidad de un bus por fecha/ruta es responsabilidad del módulo de
 *   Rutas; este composable no consulta la tabla 'Rutas'.
 */

import { ref } from 'vue';
import type { Bus } from '../../Domain/Entities/Bus';
import { CrearBus, type CrearBusInput } from '../../Application/UseCases/CrearBus';
import {
  ReactivarBus,
  type ReactivarBusResponse,
} from '../../Application/UseCases/ReactivarBus';
import {
  ActivarBus,
  DesactivarBus,
  ObtenerBusesDisponibles,
} from '../../Application/UseCases/BusUseCases';
import { SupabaseBusRepository } from '../../Infrastructure/Repositories/SupabaseBusRepository';

export interface UseControlBusesDependencies {
  obtenerBusesDisponibles: Pick<ObtenerBusesDisponibles, 'ejecutar'>;
  crearBus: Pick<CrearBus, 'ejecutar'>;
  reactivarBus: Pick<ReactivarBus, 'ejecutar'>;
  activarBus: Pick<ActivarBus, 'ejecutar'>;
  desactivarBus: Pick<DesactivarBus, 'ejecutar'>;
}

export interface UseControlBusesOptions {
  cooperativaId?: number;
  dependencies?: Partial<UseControlBusesDependencies>;
}

function crearDependenciasPorDefecto(): UseControlBusesDependencies {
  const busRepo = new SupabaseBusRepository();

  return {
    obtenerBusesDisponibles: new ObtenerBusesDisponibles(busRepo),
    crearBus: new CrearBus(busRepo),
    reactivarBus: new ReactivarBus(busRepo),
    activarBus: new ActivarBus(busRepo),
    desactivarBus: new DesactivarBus(busRepo),
  };
}

export function useControlBuses(options: UseControlBusesOptions = {}) {
  const cooperativaId = options.cooperativaId ?? 1;
  const {
    obtenerBusesDisponibles,
    crearBus: crearBusUseCase,
    reactivarBus: reactivarBusUseCase,
    activarBus: activarBusUseCase,
    desactivarBus: desactivarBusUseCase,
  } = { ...crearDependenciasPorDefecto(), ...options.dependencies };

  const buses = ref<Bus[]>([]);
  const loading = ref(false);
  const error = ref('');
  const success = ref('');

  async function cargarBusesActivos(): Promise<Bus[]> {
    loading.value = true;
    error.value = '';
    success.value = '';

    try {
      buses.value = await obtenerBusesDisponibles.ejecutar(cooperativaId);
      return buses.value;
    } catch (err: any) {
      error.value = err.message || 'No se pudieron obtener los buses activos.';
      buses.value = [];
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function crearBus(input: CrearBusInput): Promise<Bus | null> {
    loading.value = true;
    error.value = '';
    success.value = '';

    try {
      const busCreado = await crearBusUseCase.ejecutar(input);
      success.value = `Bus ${busCreado.numero} creado correctamente.`;
      return busCreado;
    } catch (err: any) {
      error.value = err.message || 'No se pudo crear el bus.';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function reactivarBus(
    busId: number,
    reactivadoPor: string,
    motivo?: string,
  ): Promise<ReactivarBusResponse | null> {
    loading.value = true;
    error.value = '';
    success.value = '';

    try {
      const response = await reactivarBusUseCase.ejecutar({
        busId,
        reactivadoPor,
        motivo,
      });
      success.value = response.mensaje;
      return response;
    } catch (err: any) {
      error.value = err.message || 'No se pudo reactivar el bus.';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function activarBus(busId: number): Promise<Bus | null> {
    loading.value = true;
    error.value = '';
    success.value = '';

    try {
      const bus = await activarBusUseCase.ejecutar(busId);
      success.value = `Bus ${bus.numero} activado correctamente.`;
      return bus;
    } catch (err: any) {
      error.value = err.message || 'No se pudo activar el bus.';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function desactivarBus(busId: number): Promise<Bus | null> {
    loading.value = true;
    error.value = '';
    success.value = '';

    try {
      const bus = await desactivarBusUseCase.ejecutar(busId);
      success.value = `Bus ${bus.numero} desactivado correctamente.`;
      return bus;
    } catch (err: any) {
      error.value = err.message || 'No se pudo desactivar el bus.';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function liberarBus(busId: number): Promise<Bus | null> {
    return activarBus(busId);
  }

  return {
    buses,
    loading,
    error,
    success,
    cargarBusesActivos,
    crearBus,
    reactivarBus,
    activarBus,
    desactivarBus,
    liberarBus,
  };
}
