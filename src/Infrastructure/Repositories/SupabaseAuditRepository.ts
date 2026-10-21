/**
 * SupabaseAuditRepository.ts - Implementación de IAuditRepository con Supabase
 * Registra y consulta pistas de auditoría y validaciones del sistema.
 */

import { supabase } from '../Api/supabaseClient';
import type {
  IAuditRepository,
  EventoAuditoria,
} from '../../Domain/Repositories/IAuditRepository';
import { UsuarioException } from '../../Domain/Exceptions/UsuarioException';

export class SupabaseAuditRepository implements IAuditRepository {
  private readonly TABLA_AUDITORIA = 'Auditoria';

  async registrarEvento(evento: EventoAuditoria): Promise<void> {
    try {
      const payload = {
        Accion: evento.accion,
        UsuarioId: evento.usuarioId ?? null,
        EntidadAfectada: evento.entidadAfectada ?? null,
        EntidadId: evento.entidadId ? String(evento.entidadId) : null,
        Detalle: evento.detalle ?? null,
        Resultado: evento.resultado ?? 'Exito',
      };

      const { error } = await supabase
        .from(this.TABLA_AUDITORIA)
        .insert(payload);

      if (error) {
        // En caso de que la tabla opcional de auditoría no esté migrada en todos los entornos, no bloqueamos la app
        console.warn(`[AuditLog] ${evento.accion} - ${evento.detalle ?? ''} (DB warning: ${error.message})`);
      }
    } catch (err: any) {
      console.warn(`[AuditLog] Excepción al registrar evento de auditoría:`, err?.message);
    }
  }

  async obtenerEventos(limite: number = 50): Promise<EventoAuditoria[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLA_AUDITORIA)
        .select('*')
        .order('Fecha', { ascending: false })
        .limit(limite);

      if (error) {
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.Id ?? row.id,
        accion: row.Accion ?? row.accion,
        usuarioId: row.UsuarioId ?? row.usuario_id,
        entidadAfectada: row.EntidadAfectada ?? row.entidad_afectada,
        entidadId: row.EntidadId ?? row.entidad_id,
        detalle: row.Detalle ?? row.detalle,
        fecha: row.Fecha ? new Date(row.Fecha) : new Date(),
        resultado: row.Resultado ?? 'Exito',
      }));
    } catch {
      return [];
    }
  }

  async obtenerEventosPorUsuario(usuarioId: string): Promise<EventoAuditoria[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLA_AUDITORIA)
        .select('*')
        .eq('UsuarioId', usuarioId)
        .order('Fecha', { ascending: false });

      if (error) {
        throw new UsuarioException(`Error al consultar auditoría del usuario ${usuarioId}: ${error.message}`);
      }

      return (data || []).map((row: any) => ({
        id: row.Id ?? row.id,
        accion: row.Accion ?? row.accion,
        usuarioId: row.UsuarioId ?? row.usuario_id,
        entidadAfectada: row.EntidadAfectada ?? row.entidad_afectada,
        entidadId: row.EntidadId ?? row.entidad_id,
        detalle: row.Detalle ?? row.detalle,
        fecha: row.Fecha ? new Date(row.Fecha) : new Date(),
        resultado: row.Resultado ?? 'Exito',
      }));
    } catch {
      return [];
    }
  }
}
