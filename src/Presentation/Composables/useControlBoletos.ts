/**
 * useControlBoletos.ts - Composable Reactivo para Control y Gestión de Boletos y Pagos
 *
 * Arquitectura:
 * - Capa de Presentación Desacoplada (Headless).
 * - Reactividad pura con Vue 3 (refs, computeds).
 * - Orquesta la aprobación/rechazo de pagos, listado de ventas pendientes y venta en taquilla.
 */

import { ref, computed } from 'vue';
import type { Venta } from '../../Domain/Entities/Venta';
import type { Boleto } from '../../Domain/Entities/Boleto';
import type { IVentaRepository } from '../../Domain/Repositories/IVentaRepository';
import type { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository';
import {
  AprobarPago,
  aprobarPagoUseCase as defaultAprobarPagoUseCase,
} from '../../Application/UseCases/AprobarPago';
import {
  RechazarPago,
  rechazarPagoUseCase as defaultRechazarPagoUseCase,
} from '../../Application/UseCases/RechazarPago';
import {
  VenderBoleto,
  venderBoletoUseCase as defaultVenderBoletoUseCase,
  type VenderBoletoInput,
  type ResultadoVentaBoleto,
} from '../../Application/UseCases/VenderBoleto';
import { SupabaseVentasRepository } from '../../Infrastructure/Repositories/SupabaseVentasRepository';
import { SupabaseBoletosRepository } from '../../Infrastructure/Repositories/SupabaseBoletosRepository';

export function useControlBoletos(
  aprobarUseCase: AprobarPago = defaultAprobarPagoUseCase,
  rechazarUseCase: RechazarPago = defaultRechazarPagoUseCase,
  venderUseCase: VenderBoleto = defaultVenderBoletoUseCase,
  ventaRepo: IVentaRepository = new SupabaseVentasRepository(),
  boletosRepo: IBoletosRepository = new SupabaseBoletosRepository(),
) {
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const ventasPendientes = ref<Venta[]>([]);
  const boletosVenta = ref<Boleto[]>([]);

  const totalPendientes = computed<number>(() => ventasPendientes.value.length);
  const tienePendientes = computed<boolean>(() => ventasPendientes.value.length > 0);
  const montoPendiente = computed<number>(() =>
    Number(
      ventasPendientes.value
        .reduce((total, venta) => total + Number(venta.total ?? 0), 0)
        .toFixed(2),
    ),
  );

  function mensajeError(err: unknown, respaldo: string): string {
    return err instanceof Error && err.message ? err.message : respaldo;
  }

  /**
   * Carga todas las ventas con pagos pendientes de validación.
   */
  async function cargarVentasPendientes(): Promise<Venta[]> {
    loading.value = true;
    error.value = null;

    try {
      const ventas = await ventaRepo.obtenerVentasPendientes();
      ventasPendientes.value = ventas;
      return ventas;
    } catch (err: unknown) {
      error.value = mensajeError(err, 'Error al listar las ventas pendientes.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Carga los boletos asociados a una venta específica.
   */
  async function cargarBoletosVenta(ventaId: number): Promise<Boleto[]> {
    loading.value = true;
    error.value = null;

    try {
      const boletos = await boletosRepo.obtenerBoletosPorVenta(ventaId);
      boletosVenta.value = boletos;
      return boletos;
    } catch (err: unknown) {
      error.value = mensajeError(err, 'Error al obtener los boletos de la venta.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Aprueba una venta y emite sus boletos, removiéndola de la lista de pendientes.
   */
  async function aprobarPago(ventaId: number, aprobadoPorId: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await aprobarUseCase.ejecutar(ventaId, aprobadoPorId);
      ventasPendientes.value = ventasPendientes.value.filter((v) => v.id !== ventaId);
    } catch (err: unknown) {
      error.value = mensajeError(err, 'Error al aprobar el pago de la venta.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Rechaza una venta y cancela sus boletos, removiéndola de la lista de pendientes.
   */
  async function rechazarPago(
    ventaId: number,
    aprobadoPorId: string,
    observacion?: string,
  ): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await rechazarUseCase.ejecutar(ventaId, aprobadoPorId, observacion);
      ventasPendientes.value = ventasPendientes.value.filter((v) => v.id !== ventaId);
    } catch (err: unknown) {
      error.value = mensajeError(err, 'Error al rechazar el pago de la venta.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Realiza una venta directa de boletos en ventanilla por parte de un oficinista.
   */
  async function venderEnVentanilla(input: VenderBoletoInput): Promise<ResultadoVentaBoleto> {
    loading.value = true;
    error.value = null;

    try {
      return await venderUseCase.ejecutar(input);
    } catch (err: unknown) {
      error.value = mensajeError(err, 'Error al registrar la venta en ventanilla.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Verifica disponibilidad de un asiento para una ruta dada.
   */
  async function verificarDisponibilidadAsiento(
    rutaId: number,
    asientoId: number,
  ): Promise<boolean> {
    try {
      return await boletosRepo.verificarAsientoDisponible(rutaId, asientoId);
    } catch (err: unknown) {
      error.value = mensajeError(err, 'Error al verificar la disponibilidad del asiento.');
      return false;
    }
  }

  function limpiar(): void {
    loading.value = false;
    error.value = null;
    ventasPendientes.value = [];
    boletosVenta.value = [];
  }

  return {
    loading,
    error,
    ventasPendientes,
    boletosVenta,
    totalPendientes,
    montoPendiente,
    tienePendientes,
    cargarVentasPendientes,
    cargarBoletosVenta,
    aprobarPago,
    rechazarPago,
    venderEnVentanilla,
    verificarDisponibilidadAsiento,
    limpiar,
  };
}
