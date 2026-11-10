/**
 * ICambiosRepository.ts - Contrato de Dominio para Gestión de Cambios (ITIL 4 / CCB)
 * Basado en la tabla oficial "Cambios"
 */

import {
  EstadoCambio,
  TipoCambio,
  PrioridadCambio,
} from '../Constants/EstadosSistema';

export interface SolicitudCambio {
  id?: number;
  titulo: string;
  descripcion: string;
  tipoCambio: TipoCambio;
  prioridad: PrioridadCambio;
  estado?: EstadoCambio;
  solicitadoPor: string;
  aprobadoPorCCB?: string | null;
  fechaSolicitud?: Date;
  fechaAprobacion?: Date | null;
  fechaImplementacion?: Date | null;
  githubIssueUrl?: string | null;
  impactoEstimado?: string | null;
}

export interface ICambiosRepository {
  solicitarCambio(cambio: SolicitudCambio): Promise<number>;
  obtenerCambios(): Promise<SolicitudCambio[]>;
  obtenerCambioPorId(id: number): Promise<SolicitudCambio | null>;
  actualizarEstado(
    id: number,
    estado: EstadoCambio,
    aprobadoPorCCB?: string,
  ): Promise<void>;
}
