/**
 * useVentaDescuento.ts - Composable Reactivo para Cálculo de Descuentos y Confirmación de Compra
 *
 * Arquitectura:
 * - Lógica de presentación reactiva desacoplada (Headless).
 * - Reactividad pura con Vue 3 (refs, computeds).
 * - Cero maquetación HTML/CSS.
 */

import { ref, computed } from 'vue';
import type {
  CalcularDescuentoVentaDto,
  ResultadoDescuentoVentaDto,
} from '../../Application/Dtos/CalcularDescuentoVentaDto';
import { CalcularDescuentoVenta } from '../../Application/UseCases/CalcularDescuentoVenta';
import {
  ConfirmarCompra,
  confirmarCompraUseCase as defaultConfirmarCompraUseCase,
  type ConfirmInput,
} from '../../Application/UseCases/ConfirmarCompra';

export function useVentaDescuento(
  calcularUseCase: CalcularDescuentoVenta = new CalcularDescuentoVenta(),
  confirmarUseCase: ConfirmarCompra = defaultConfirmarCompraUseCase,
) {
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const descuento = ref<ResultadoDescuentoVentaDto | null>(null);
  const ultimaVenta = ref<any | null>(null);

  const tieneDescuento = computed<boolean>(() => {
    return Boolean(descuento.value && descuento.value.porcentajeDescuento > 0);
  });

  const precioFinalCalculado = computed<number | null>(() => {
    return descuento.value ? descuento.value.precioFinal : null;
  });

  /**
   * Calcula el descuento para un pasajero según sus datos de cédula, edad y condición.
   */
  function calcularDescuento(dto: CalcularDescuentoVentaDto): ResultadoDescuentoVentaDto {
    error.value = null;
    try {
      const resultado = calcularUseCase.ejecutar(dto);
      descuento.value = resultado;
      return resultado;
    } catch (err: any) {
      error.value = err.message || 'Error al calcular el descuento de venta.';
      throw err;
    }
  }

  /**
   * Confirma la compra de boletos aplicando validaciones, comprobante o cobro.
   */
  async function confirmar(input: ConfirmInput): Promise<any> {
    loading.value = true;
    error.value = null;

    try {
      const resultado = await confirmarUseCase.ejecutar(input);
      ultimaVenta.value = resultado;
      return resultado;
    } catch (err: any) {
      error.value = err.message || 'Error al confirmar la compra.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Restablece el estado reactivo del composable.
   */
  function limpiar(): void {
    loading.value = false;
    error.value = null;
    descuento.value = null;
    ultimaVenta.value = null;
  }

  return {
    loading,
    error,
    descuento,
    ultimaVenta,
    tieneDescuento,
    precioFinalCalculado,
    calcularDescuento,
    confirmar,
    limpiar,
  };
}
