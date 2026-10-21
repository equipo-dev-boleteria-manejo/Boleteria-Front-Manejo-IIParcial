/**
 * SupabaseCambiosRepository.ts - Implementación de ICambiosRepository con Supabase
 * Alineado estrictamente con la tabla "Cambios" del esquema oficial (ITIL 4 / CCB).
 */

import { supabase } from '../Api/supabaseClient';
import type {
  ICambiosRepository,
  SolicitudCambio,
} from '../../Domain/Repositories/ICambiosRepository';
import {
  EstadoCambio,
  TipoCambio,
  PrioridadCambio,
} from '../../Domain/Constants/EstadosSistema';
import { UsuarioException } from '../../Domain/Exceptions/UsuarioException';

interface CambioRow {
  Id: number;
  Titulo: string;
  Descripcion: string;
  TipoCambio: string;
  Prioridad: string;
  Estado: string;
  SolicitadoPor: string;
  AprobadoPorCCB: string | null;
  FechaSolicitud: string | null;
  FechaAprobacion: string | null;
  FechaImplementacion: string | null;
  GithubIssueUrl: string | null;
  ImpactoEstimado: string | null;
}

export class SupabaseCambiosRepository implements ICambiosRepository {
  private readonly TABLA_CAMBIOS = 'Cambios';

  async solicitarCambio(cambio: SolicitudCambio): Promise<number> {
    const row = {
      Titulo: cambio.titulo.trim(),
      Descripcion: cambio.descripcion.trim(),
      TipoCambio: cambio.tipoCambio,
      Prioridad: cambio.prioridad,
      Estado: cambio.estado ?? EstadoCambio.SOLICITADO,
      SolicitadoPor: cambio.solicitadoPor.trim(),
      AprobadoPorCCB: cambio.aprobadoPorCCB ?? null,
      GithubIssueUrl: cambio.githubIssueUrl ?? null,
      ImpactoEstimado: cambio.impactoEstimado ?? null,
    };

    const { data, error } = await supabase
      .from(this.TABLA_CAMBIOS)
      .insert(row)
      .select('Id')
      .single();

    if (error) {
      throw new UsuarioException(`Error al registrar solicitud de cambio: ${error.message}`);
    }

    return (data as { Id: number }).Id;
  }

  async obtenerCambios(): Promise<SolicitudCambio[]> {
    const { data, error } = await supabase
      .from(this.TABLA_CAMBIOS)
      .select('*')
      .order('FechaSolicitud', { ascending: false });

    if (error) {
      throw new UsuarioException(`Error al listar solicitudes de cambio: ${error.message}`);
    }

    return (data as CambioRow[]).map((row) => this.mapRowToEntity(row));
  }

  async obtenerCambioPorId(id: number): Promise<SolicitudCambio | null> {
    const { data, error } = await supabase
      .from(this.TABLA_CAMBIOS)
      .select('*')
      .eq('Id', id)
      .maybeSingle();

    if (error) {
      throw new UsuarioException(`Error al consultar solicitud de cambio ${id}: ${error.message}`);
    }

    if (!data) return null;
    return this.mapRowToEntity(data as CambioRow);
  }

  async actualizarEstado(
    id: number,
    estado: EstadoCambio,
    aprobadoPorCCB?: string,
  ): Promise<void> {
    const updateData: Record<string, any> = {
      Estado: estado,
    };

    if (aprobadoPorCCB) {
      updateData.AprobadoPorCCB = aprobadoPorCCB;
      updateData.FechaAprobacion = new Date().toISOString();
    }

    if (estado === EstadoCambio.IMPLEMENTADO) {
      updateData.FechaImplementacion = new Date().toISOString();
    }

    const { error } = await supabase
      .from(this.TABLA_CAMBIOS)
      .update(updateData)
      .eq('Id', id);

    if (error) {
      throw new UsuarioException(`Error al actualizar estado del cambio ${id}: ${error.message}`);
    }
  }

  private mapRowToEntity(row: CambioRow): SolicitudCambio {
    return {
      id: row.Id,
      titulo: row.Titulo,
      descripcion: row.Descripcion,
      tipoCambio: row.TipoCambio as TipoCambio,
      prioridad: row.Prioridad as PrioridadCambio,
      estado: row.Estado as EstadoCambio,
      solicitadoPor: row.SolicitadoPor,
      aprobadoPorCCB: row.AprobadoPorCCB,
      fechaSolicitud: row.FechaSolicitud ? new Date(row.FechaSolicitud) : undefined,
      fechaAprobacion: row.FechaAprobacion ? new Date(row.FechaAprobacion) : null,
      fechaImplementacion: row.FechaImplementacion
        ? new Date(row.FechaImplementacion)
        : null,
      githubIssueUrl: row.GithubIssueUrl,
      impactoEstimado: row.ImpactoEstimado,
    };
  }
}
