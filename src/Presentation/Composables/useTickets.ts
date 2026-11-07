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

export interface GrupoBoletosResumen {
  ventaId: number;
  rutaId: number;
  boletos: Boleto[];
  total: number;
  estado: string;
  creadoEn: number;
}

export function useTickets(
  historialUseCase: VerHistorialBoletos = defaultVerHistorialBoletosUseCase,
) {
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const boletos = ref<Boleto[]>([]);
  const boletoSeleccionado = ref<Boleto | null>(null);

  const tieneBoletos = computed<boolean>(() => boletos.value.length > 0);
  const totalBoletos = computed<number>(() => boletos.value.length);
  const totalGastado = computed<number>(() =>
    Number(
      boletos.value
        .reduce((total, boleto) => total + Number(boleto.precioFinal ?? 0), 0)
        .toFixed(2),
    ),
  );

  const gruposPorVenta = computed<GrupoBoletosResumen[]>(() => {
    const porVenta = new Map<number, Boleto[]>();

    boletos.value.forEach((boleto) => {
      const lista = porVenta.get(boleto.ventaId) ?? [];
      lista.push(boleto);
      porVenta.set(boleto.ventaId, lista);
    });

    return Array.from(porVenta.entries())
      .map(([ventaId, lista]) => {
        const ordenados = [...lista].sort((a, b) => a.asientoId - b.asientoId);
        const primero = ordenados[0];
        const estados = new Set(ordenados.map((boleto) => boleto.estado));
        const creadoEn = Math.max(
          ...ordenados.map((boleto) =>
            boleto.createdAt ? new Date(boleto.createdAt).getTime() : 0,
          ),
        );

        return {
          ventaId,
          rutaId: primero.rutaId,
          boletos: ordenados,
          total: Number(
            ordenados
              .reduce(
                (acumulado, boleto) =>
                  acumulado + Number(boleto.precioFinal ?? 0),
                0,
              )
              .toFixed(2),
          ),
          estado: estados.size === 1 ? primero.estado : 'Estados variados',
          creadoEn: Number.isFinite(creadoEn) ? creadoEn : 0,
        };
      })
      .sort((a, b) => b.creadoEn - a.creadoEn);
  });

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
    } catch (err: unknown) {
      error.value =
        err instanceof Error && err.message
          ? err.message
          : 'Error al cargar el historial de boletos.';
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
    totalGastado,
    gruposPorVenta,
    cargarHistorial,
    seleccionarBoleto,
    limpiar,
  };
}
