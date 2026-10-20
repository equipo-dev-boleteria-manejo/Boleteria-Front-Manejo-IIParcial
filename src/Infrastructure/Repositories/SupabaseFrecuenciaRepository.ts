/**
 * SupabaseFrecuenciaRepository.ts - Implementación de IFrecuenciaRepository con Supabase
 *
 * Tablas (ver supabase/schema.sql): "Frecuencias" y "ParadasIntermedias".
 */

import { supabase } from "../Api/supabaseClient";
import {
  Frecuencia,
  ParadaIntermedia,
  type DiaOperacion,
} from "../../Domain/Entities/Frecuencia";
import type {
  FrecuenciaFiltros,
  IFrecuenciaRepository,
} from "../../Domain/Repositories/IFrecuenciaRepository";

interface ParadaRow {
  Id: number;
  FrecuenciaId: number;
  Ciudad: string;
  Orden: number;
  MinutosDesdeOrigen: number;
  PermiteVenta: boolean;
  CostoProporcional: number | string | null;
}

interface FrecuenciaRow {
  Id: number;
  CooperativaId: number;
  CiudadOrigen: string;
  CiudadDestino: string;
  HoraSalida: string;
  EsDirecto: boolean;
  CodigoAnt: string | null;
  ResolucionAnt: string | null;
  IdentificadorFrecuencia: string;
  DiasOperacion: DiaOperacion[];
  Activa: boolean;
  CreatedAt: string | null;
  ParadasIntermedias?: ParadaRow[];
}

export class SupabaseFrecuenciaRepository implements IFrecuenciaRepository {
  private readonly TABLA_FRECUENCIAS = "Frecuencias";
  private readonly TABLA_PARADAS = "ParadasIntermedias";
  private readonly SELECT_CON_PARADAS = "*, ParadasIntermedias(*)";

  async obtenerTodas(filtros?: FrecuenciaFiltros): Promise<Frecuencia[]> {
    let query = supabase
      .from(this.TABLA_FRECUENCIAS)
      .select(this.SELECT_CON_PARADAS);

    if (filtros?.cooperativaId) {
      query = query.eq("CooperativaId", filtros.cooperativaId);
    }
    if (filtros?.ciudadOrigen) {
      query = query.ilike("CiudadOrigen", this.escaparLike(filtros.ciudadOrigen));
    }
    if (filtros?.ciudadDestino) {
      query = query.ilike(
        "CiudadDestino",
        this.escaparLike(filtros.ciudadDestino),
      );
    }
    if (filtros?.dia) {
      query = query.contains("DiasOperacion", [filtros.dia]);
    }
    if (filtros?.soloActivas) {
      query = query.eq("Activa", true);
    }

    const { data, error } = await query
      .order("HoraSalida", { ascending: true })
      .order("Orden", { referencedTable: this.TABLA_PARADAS, ascending: true });

    if (error) throw new Error(`Error al obtener frecuencias: ${error.message}`);
    return ((data ?? []) as FrecuenciaRow[]).map((fila) =>
      this.mapearFrecuencia(fila),
    );
  }

  async obtenerPorId(id: number): Promise<Frecuencia | null> {
    const { data, error } = await supabase
      .from(this.TABLA_FRECUENCIAS)
      .select(this.SELECT_CON_PARADAS)
      .eq("Id", id)
      .order("Orden", { referencedTable: this.TABLA_PARADAS, ascending: true })
      .maybeSingle();

    if (error) throw new Error(`Error al obtener frecuencia: ${error.message}`);
    return data ? this.mapearFrecuencia(data as FrecuenciaRow) : null;
  }

  async obtenerPorCooperativa(cooperativaId: number): Promise<Frecuencia[]> {
    return this.obtenerTodas({ cooperativaId });
  }

  async obtenerPorIdentificador(
    cooperativaId: number,
    identificadorFrecuencia: string,
  ): Promise<Frecuencia | null> {
    const { data, error } = await supabase
      .from(this.TABLA_FRECUENCIAS)
      .select(this.SELECT_CON_PARADAS)
      .eq("CooperativaId", cooperativaId)
      .eq("IdentificadorFrecuencia", identificadorFrecuencia.trim())
      .order("Orden", { referencedTable: this.TABLA_PARADAS, ascending: true })
      .maybeSingle();

    if (error) throw new Error(`Error al obtener frecuencia: ${error.message}`);
    return data ? this.mapearFrecuencia(data as FrecuenciaRow) : null;
  }

  async buscarPorTramo(
    origen: string,
    destino: string,
    dia?: DiaOperacion,
  ): Promise<Frecuencia[]> {
    const activas = await this.obtenerTodas({ soloActivas: true, dia });
    return activas.filter((frecuencia) => frecuencia.cubreTramo(origen, destino));
  }

  async crear(frecuencia: Frecuencia): Promise<Frecuencia> {
    if (!frecuencia.esValida()) {
      throw new Error(
        "La frecuencia contiene datos inválidos. Verifica origen, destino, hora, identificador, días y paradas",
      );
    }

    const existente = await this.obtenerPorIdentificador(
      frecuencia.cooperativaId,
      frecuencia.identificadorFrecuencia,
    );
    if (existente) {
      throw new Error(
        `El identificador ${frecuencia.identificadorFrecuencia} ya existe para esta cooperativa`,
      );
    }

    const { data, error } = await supabase
      .from(this.TABLA_FRECUENCIAS)
      .insert([this.mapearFrecuenciaAFila(frecuencia)])
      .select()
      .single();

    if (error) throw new Error(`Error al crear frecuencia: ${error.message}`);

    const creada = this.mapearFrecuencia(data as FrecuenciaRow);
    if (frecuencia.paradas.length === 0) return creada;

    const { data: paradas, error: errorParadas } = await supabase
      .from(this.TABLA_PARADAS)
      .insert(
        frecuencia.paradas.map((parada) =>
          this.mapearParadaAFila(parada, creada.id!),
        ),
      )
      .select();

    if (errorParadas) {
      // No hay transacciones desde el cliente: se revierte la frecuencia recién creada.
      await supabase.from(this.TABLA_FRECUENCIAS).delete().eq("Id", creada.id!);
      throw new Error(`Error al crear paradas: ${errorParadas.message}`);
    }

    creada.paradas = ((paradas ?? []) as ParadaRow[])
      .map((fila) => this.mapearParada(fila))
      .sort((a, b) => a.orden - b.orden);
    return creada;
  }

  async actualizar(
    id: number,
    cambios: Partial<Frecuencia>,
  ): Promise<Frecuencia> {
    const actual = await this.obtenerPorId(id);
    if (!actual) throw new Error(`Frecuencia con ID ${id} no encontrada`);

    const actualizada = new Frecuencia(
      cambios.cooperativaId ?? actual.cooperativaId,
      cambios.ciudadOrigen ?? actual.ciudadOrigen,
      cambios.ciudadDestino ?? actual.ciudadDestino,
      cambios.horaSalida ?? actual.horaSalida,
      cambios.identificadorFrecuencia ?? actual.identificadorFrecuencia,
      cambios.esDirecto ?? actual.esDirecto,
      cambios.diasOperacion ?? actual.diasOperacion,
      cambios.activa ?? actual.activa,
    );
    actualizada.id = id;
    actualizada.codigoAnt = cambios.codigoAnt ?? actual.codigoAnt;
    actualizada.resolucionAnt = cambios.resolucionAnt ?? actual.resolucionAnt;
    actualizada.paradas = actual.paradas;

    if (!actualizada.esValida()) {
      throw new Error("La frecuencia contiene datos inválidos");
    }

    const { error } = await supabase
      .from(this.TABLA_FRECUENCIAS)
      .update(this.mapearFrecuenciaAFila(actualizada))
      .eq("Id", id);

    if (error) throw new Error(`Error al actualizar frecuencia: ${error.message}`);
    return actualizada;
  }

  async desactivar(id: number): Promise<void> {
    const { error } = await supabase
      .from(this.TABLA_FRECUENCIAS)
      .update({ Activa: false })
      .eq("Id", id);

    if (error) throw new Error(`Error al desactivar frecuencia: ${error.message}`);
  }

  async obtenerParadas(frecuenciaId: number): Promise<ParadaIntermedia[]> {
    const { data, error } = await supabase
      .from(this.TABLA_PARADAS)
      .select("*")
      .eq("FrecuenciaId", frecuenciaId)
      .order("Orden", { ascending: true });

    if (error) throw new Error(`Error al obtener paradas: ${error.message}`);
    return ((data ?? []) as ParadaRow[]).map((fila) => this.mapearParada(fila));
  }

  async agregarParada(
    frecuenciaId: number,
    parada: ParadaIntermedia,
  ): Promise<ParadaIntermedia> {
    const frecuencia = await this.obtenerPorId(frecuenciaId);
    if (!frecuencia) {
      throw new Error(`Frecuencia con ID ${frecuenciaId} no encontrada`);
    }

    frecuencia.agregarParada(parada);
    if (!frecuencia.paradasSonValidas()) {
      throw new Error(
        "La parada es inválida o su orden/tiempo es inconsistente con las demás paradas",
      );
    }

    const { data, error } = await supabase
      .from(this.TABLA_PARADAS)
      .insert([this.mapearParadaAFila(parada, frecuenciaId)])
      .select()
      .single();

    if (error) throw new Error(`Error al agregar parada: ${error.message}`);
    return this.mapearParada(data as ParadaRow);
  }

  async actualizarParada(
    id: number,
    cambios: Partial<ParadaIntermedia>,
  ): Promise<ParadaIntermedia> {
    const { data: fila, error: errorLectura } = await supabase
      .from(this.TABLA_PARADAS)
      .select("*")
      .eq("Id", id)
      .maybeSingle();

    if (errorLectura) {
      throw new Error(`Error al obtener parada: ${errorLectura.message}`);
    }
    if (!fila) throw new Error(`Parada con ID ${id} no encontrada`);

    const actual = this.mapearParada(fila as ParadaRow);
    const actualizada = new ParadaIntermedia(
      cambios.ciudad ?? actual.ciudad,
      cambios.orden ?? actual.orden,
      cambios.minutosDesdeOrigen ?? actual.minutosDesdeOrigen,
      cambios.permiteVenta ?? actual.permiteVenta,
      cambios.costoProporcional ?? actual.costoProporcional,
    );
    actualizada.id = id;
    actualizada.frecuenciaId = actual.frecuenciaId;

    const frecuencia = await this.obtenerPorId(actual.frecuenciaId!);
    if (!frecuencia) {
      throw new Error(`Frecuencia con ID ${actual.frecuenciaId} no encontrada`);
    }

    frecuencia.paradas = frecuencia.paradas.map((parada) =>
      parada.id === id ? actualizada : parada,
    );
    if (!frecuencia.paradasSonValidas()) {
      throw new Error(
        "La parada es inválida o su orden/tiempo es inconsistente con las demás paradas",
      );
    }

    const { data, error } = await supabase
      .from(this.TABLA_PARADAS)
      .update(this.mapearParadaAFila(actualizada, actual.frecuenciaId!))
      .eq("Id", id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar parada: ${error.message}`);
    return this.mapearParada(data as ParadaRow);
  }

  async eliminarParada(id: number): Promise<void> {
    const { error } = await supabase
      .from(this.TABLA_PARADAS)
      .delete()
      .eq("Id", id);

    if (error) throw new Error(`Error al eliminar parada: ${error.message}`);
  }

  /** Escapa los comodines de LIKE para que ilike() compare el texto literal. */
  private escaparLike(texto: string): string {
    return texto.trim().replace(/[\\%_]/g, "\\$&");
  }

  private mapearFrecuencia(fila: FrecuenciaRow): Frecuencia {
    const frecuencia = new Frecuencia(
      fila.CooperativaId,
      fila.CiudadOrigen,
      fila.CiudadDestino,
      fila.HoraSalida.slice(0, 5),
      fila.IdentificadorFrecuencia,
      fila.EsDirecto,
      fila.DiasOperacion,
      fila.Activa,
    );

    frecuencia.id = fila.Id;
    frecuencia.codigoAnt = fila.CodigoAnt ?? undefined;
    frecuencia.resolucionAnt = fila.ResolucionAnt ?? undefined;
    frecuencia.createdAt = fila.CreatedAt ? new Date(fila.CreatedAt) : undefined;
    frecuencia.paradas = (fila.ParadasIntermedias ?? [])
      .map((parada) => this.mapearParada(parada))
      .sort((a, b) => a.orden - b.orden);
    return frecuencia;
  }

  private mapearFrecuenciaAFila(frecuencia: Frecuencia) {
    return {
      CooperativaId: frecuencia.cooperativaId,
      CiudadOrigen: frecuencia.ciudadOrigen.trim(),
      CiudadDestino: frecuencia.ciudadDestino.trim(),
      HoraSalida: frecuencia.horaSalida,
      EsDirecto: frecuencia.esDirecto,
      CodigoAnt: frecuencia.codigoAnt ?? null,
      ResolucionAnt: frecuencia.resolucionAnt ?? null,
      IdentificadorFrecuencia: frecuencia.identificadorFrecuencia.trim(),
      DiasOperacion: frecuencia.diasOperacion,
      Activa: frecuencia.activa,
    };
  }

  private mapearParada(fila: ParadaRow): ParadaIntermedia {
    const parada = new ParadaIntermedia(
      fila.Ciudad,
      fila.Orden,
      fila.MinutosDesdeOrigen,
      fila.PermiteVenta,
      Number(fila.CostoProporcional ?? 0),
    );

    parada.id = fila.Id;
    parada.frecuenciaId = fila.FrecuenciaId;
    return parada;
  }

  private mapearParadaAFila(parada: ParadaIntermedia, frecuenciaId: number) {
    return {
      FrecuenciaId: frecuenciaId,
      Ciudad: parada.ciudad.trim(),
      Orden: parada.orden,
      MinutosDesdeOrigen: parada.minutosDesdeOrigen,
      PermiteVenta: parada.permiteVenta,
      CostoProporcional: parada.costoProporcional,
    };
  }
}
