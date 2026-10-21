/**
 * IAuditRepository.ts - Contrato de Dominio para Auditoría y Trazabilidad de Eventos
 */

export interface EventoAuditoria {
  id?: number | string;
  accion: string;
  usuarioId?: string | null;
  entidadAfectada?: string;
  entidadId?: string | number;
  detalle?: string;
  fecha?: Date;
  resultado?: 'Exito' | 'Fallo';
}

export interface IAuditRepository {
  registrarEvento(evento: EventoAuditoria): Promise<void>;
  obtenerEventos(limite?: number): Promise<EventoAuditoria[]>;
  obtenerEventosPorUsuario(usuarioId: string): Promise<EventoAuditoria[]>;
}
