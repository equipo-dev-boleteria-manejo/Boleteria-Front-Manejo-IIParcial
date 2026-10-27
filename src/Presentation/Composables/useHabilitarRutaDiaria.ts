/**
 * useHabilitarRutaDiaria.ts - Composable Reactivo para Habilitar Rutas Diarias
 *
 * Arquitectura:
 * - Capa de Presentación Desacoplada (Headless).
 * - Reactividad pura (refs, loading, error, rutaCreada).
 * - Cero maquetación HTML/CSS.
 */

import { ref } from 'vue';
import type { Ruta } from '../../Domain/Entities/Ruta';
import {
  HabilitarRutaDiaria,
  habilitarRutaDiariaUseCase as defaultHabilitarRutaDiariaUseCase,
  type HabilitarRutaInput,
} from '../../Application/UseCases/HabilitarRutaDiaria';

export function useHabilitarRutaDiaria(
  useCase: HabilitarRutaDiaria = defaultHabilitarRutaDiariaUseCase
) {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const rutaCreada = ref<Ruta | null>(null);

  async function habilitar(input: HabilitarRutaInput): Promise<Ruta> {
    loading.value = true;
    error.value = null;

    try {
      const ruta = await useCase.ejecutar(input);
      rutaCreada.value = ruta;
      return ruta;
    } catch (err: any) {
      error.value = err.message || 'Error al habilitar la ruta diaria.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function limpiar(): void {
    loading.value = false;
    error.value = null;
    rutaCreada.value = null;
  }

  return {
    loading,
    error,
    rutaCreada,
    habilitar,
    limpiar,
  };
}
