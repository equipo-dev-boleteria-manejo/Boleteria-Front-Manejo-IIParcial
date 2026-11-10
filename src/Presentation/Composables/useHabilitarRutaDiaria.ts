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
import type { DiaOperacion, Frecuencia } from '../../Domain/Entities/Frecuencia';
import {
  HabilitarRutaDiaria,
  habilitarRutaDiariaUseCase as defaultHabilitarRutaDiariaUseCase,
  type HabilitarRutaInput,
} from '../../Application/UseCases/HabilitarRutaDiaria';
import { mensajeErrorParaUsuario } from '../Utils/errorMessage';

const DIAS_SEMANA: readonly DiaOperacion[] = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
];

export function useHabilitarRutaDiaria(
  useCase: HabilitarRutaDiaria = defaultHabilitarRutaDiariaUseCase
) {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const rutaCreada = ref<Ruta | null>(null);

  function esDiaOperativo(frecuencia: Frecuencia, fecha: string): boolean {
    if (!fecha || Number.isNaN(Date.parse(fecha))) return false;

    const fechaLocal = new Date(`${fecha}T00:00:00`);
    const dia = DIAS_SEMANA[fechaLocal.getDay()];
    return Boolean(dia && frecuencia.opera(dia));
  }

  async function habilitar(input: HabilitarRutaInput): Promise<Ruta> {
    loading.value = true;
    error.value = null;

    try {
      const ruta = await useCase.ejecutar(input);
      rutaCreada.value = ruta;
      return ruta;
    } catch (err: unknown) {
      error.value = mensajeErrorParaUsuario(err, 'Error al habilitar la ruta diaria.');
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
    esDiaOperativo,
    habilitar,
    limpiar,
  };
}
