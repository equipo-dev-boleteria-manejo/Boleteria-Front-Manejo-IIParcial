/**
 * useReportes.ts - Composable de Presentación para Auditoría y Métricas de Trazabilidad
 *
 * Arquitectura:
 * - 100% desacoplado de llamadas directas a base de datos o clientes de infraestructura.
 * - Consume IAuditRepository y ObtenerConteoCambios UseCase a través de inversión de dependencias.
 */

import { ref } from 'vue';
import type { IAuditRepository, EventoAuditoria } from '../../Domain/Repositories/IAuditRepository';
import { SupabaseAuditRepository } from '../../Infrastructure/Repositories/SupabaseAuditRepository';
import {
  ObtenerConteoCambios,
  obtenerConteoCambiosUseCase as defaultConteoCambiosUseCase,
  type ConteoCambiosResultado,
} from '../../Application/UseCases/ObtenerConteoCambios';

export function useReportes(
  auditRepo: IAuditRepository = new SupabaseAuditRepository(),
  conteoCambiosService: ObtenerConteoCambios = defaultConteoCambiosUseCase
) {
  const eventosAuditoria = ref<EventoAuditoria[]>([]);
  const resumenCambios = ref<ConteoCambiosResultado | null>(null);

  const loading = ref({
    auditoria: false,
    cambios: false,
  });

  const error = ref<{ auditoria: string | null; cambios: string | null }>({
    auditoria: null,
    cambios: null,
  });

  async function cargarAuditoria(limite: number = 50): Promise<void> {
    loading.value.auditoria = true;
    error.value.auditoria = null;

    try {
      eventosAuditoria.value = await auditRepo.obtenerEventos(limite);
    } catch (err: any) {
      error.value.auditoria = err.message || 'Error al consultar el registro de auditoría';
    } finally {
      loading.value.auditoria = false;
    }
  }

  async function cargarResumenCambios(): Promise<void> {
    loading.value.cambios = true;
    error.value.cambios = null;

    try {
      resumenCambios.value = await conteoCambiosService.execute();
    } catch (err: any) {
      error.value.cambios = err.message || 'Error al obtener el balance de cambios';
    } finally {
      loading.value.cambios = false;
    }
  }

  async function registrarEvento(
    accion: string,
    detalle?: string,
    entidadAfectada?: string,
    entidadId?: string | number
  ): Promise<void> {
    try {
      await auditRepo.registrarEvento({
        accion,
        detalle,
        entidadAfectada,
        entidadId,
        fecha: new Date(),
        resultado: 'Exito',
      });
    } catch {
      // La auditoría no debe bloquear el flujo principal si falla
    }
  }

  return {
    eventosAuditoria,
    resumenCambios,
    loading,
    error,
    cargarAuditoria,
    cargarResumenCambios,
    registrarEvento,
  };
}
