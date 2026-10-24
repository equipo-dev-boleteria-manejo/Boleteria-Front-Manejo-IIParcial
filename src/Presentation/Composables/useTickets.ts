/**
 * useTickets.ts - Composable Reactivo para Consulta y Gestión de Boletos/Tickets de Usuario
 *
 * Arquitectura:
 * - Capa de Presentación Desacoplada (Headless).
 * - Reactividad pura con Vue 3 (refs, computeds).
 * - Orquesta el caso de uso VerHistorialBoletos.
 */

import { ref, computed } from 'vue';
import type { Boleto } from '../../Domain/Entities/Boleto';
import {
  VerHistorialBoletos,
  verHistorialBoletosUseCase as defaultVerHistorialBoletosUseCase,
} from '../../Application/UseCases/VerHistorialBoletos';

export function useTickets(
  historialUseCase: VerHistorialBoletos = defaultVerHistorialBoletosUseCase,
) {
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const boletos = ref<Boleto[]>([]);
  const boletoSeleccionado = ref<Boleto | null>(null);

  const tieneBoletos = computed<boolean>(() => boletos.value.length > 0);
  const totalBoletos = computed<number>(() => boletos.value.length);

  /**
   * Carga los boletos asociados a la cédula o identificador del usuario.
   */
  async function cargarHistorial(usuarioIdOrCedula: string | number): Promise<Boleto[]> {
    loading.value = true;
    error.value = null;

    try {
      const lista = await historialUseCase.ejecutar(usuarioIdOrCedula);
      boletos.value = lista;
      return lista;
    } catch (err: any) {
      error.value = err.message || 'Error al cargar el historial de boletos.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Selecciona un boleto activo para ver su detalle (QR, código de barras, etc.).
   */
  function seleccionarBoleto(boleto: Boleto | null): void {
    boletoSeleccionado.value = boleto;
  }

  /**
   * Limpia el estado reactivo del composable.
   */
  function limpiar(): void {
    loading.value = false;
    error.value = null;
    boletos.value = [];
    boletoSeleccionado.value = null;
  }

  return {
    loading,
    error,
    boletos,
    boletoSeleccionado,
    tieneBoletos,
    totalBoletos,
    cargarHistorial,
    seleccionarBoleto,
    limpiar,
  };
}
