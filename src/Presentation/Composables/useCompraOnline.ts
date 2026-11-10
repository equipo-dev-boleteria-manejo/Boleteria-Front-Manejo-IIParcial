/**
 * useCompraOnline.ts - Composable para compras pagadas en línea.
 *
 * Delega la secuencia reservar → cobrar → verificar → confirmar al caso de uso
 * ProcesarCompraOnline y expone estado de carga/error a la vista.
 */

import { computed, ref } from 'vue';
import {
  ProcesarCompraOnline,
  procesarCompraOnlineUseCase as defaultProcesarCompraOnline,
  type CobrarConTarjeta,
} from '../../Application/UseCases/ProcesarCompraOnline';
import type {
  ConfirmInput,
  ResultadoConfirmacionCompra,
} from '../../Application/UseCases/ConfirmarCompra';

export function useCompraOnline(
  procesarUseCase: ProcesarCompraOnline = defaultProcesarCompraOnline,
) {
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const ultimaCompra = ref<ResultadoConfirmacionCompra | null>(null);

  const tieneError = computed<boolean>(() => error.value !== null);

  async function comprar(
    input: ConfirmInput,
    cobrarConTarjeta: CobrarConTarjeta,
  ): Promise<ResultadoConfirmacionCompra> {
    loading.value = true;
    error.value = null;

    try {
      const resultado = await procesarUseCase.ejecutar(input, cobrarConTarjeta);
      ultimaCompra.value = resultado;
      return resultado;
    } catch (err: unknown) {
      error.value =
        err instanceof Error && err.message
          ? err.message
          : 'No se pudo completar la compra de los boletos.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function limpiar(): void {
    loading.value = false;
    error.value = null;
    ultimaCompra.value = null;
  }

  return {
    loading,
    error,
    ultimaCompra,
    tieneError,
    comprar,
    limpiar,
  };
}
