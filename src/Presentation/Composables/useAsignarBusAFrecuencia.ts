/**
 * useAsignarBusAFrecuencia.ts - Composable de asignación de bus a frecuencia
 *
 * Arquitectura:
 * - Lógica de presentación reactiva desacoplada (Headless).
 * - No contiene HTML, CSS ni acoplamiento a vistas específicas.
 * - Gestiona el estado reactivo (loading, error, ruta) y orquesta el AsignarBusAFrecuenciaUseCase.
 */

import { computed, ref, shallowRef } from 'vue';
import type { Ruta } from '../../Domain/Entities/Ruta';
import type { AsignarBusAFrecuenciaDto } from '../../Application/Dtos/AsignarBusAFrecuenciaDto';
import {
  AsignarBusAFrecuenciaUseCase,
  asignarBusAFrecuenciaUseCase as defaultUseCase,
} from '../../Application/UseCases/AsignarBusAFrecuencia';

export function useAsignarBusAFrecuencia(useCase: AsignarBusAFrecuenciaUseCase = defaultUseCase) {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const ruta = shallowRef<Ruta | null>(null);

  const asignado = computed(() => ruta.value !== null);

  /**
   * Asigna el bus a la frecuencia en la fecha indicada y guarda la ruta resultante.
   */
  async function asignar(dto: AsignarBusAFrecuenciaDto): Promise<Ruta> {
    loading.value = true;
    error.value = null;
    ruta.value = null;

    try {
      const resultado = await useCase.execute(dto);
      ruta.value = resultado;
      return resultado;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error al asignar el bus a la frecuencia';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Descarta el resultado y el error de la última asignación.
   */
  function limpiar(): void {
    ruta.value = null;
    error.value = null;
  }

  return {
    loading,
    error,
    ruta,
    asignado,
    asignar,
    limpiar,
  };
}
