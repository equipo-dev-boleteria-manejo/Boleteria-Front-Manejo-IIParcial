/**
 * SupabaseHojaRutaRepository.ts - Implementación de IHojaRutaRepository con Supabase
 * Alineado estrictamente con la tabla "HojasRuta" del esquema oficial.
 */

import { supabase } from '../Api/supabaseClient';
import { HojaRuta } from '../../Domain/Entities/HojaRuta';
import { EstadoHojaRuta } from '../../Domain/Constants/EstadosSistema';
import type {
  HojaRutaFiltros,
  IHojaRutaRepository,
} from '../../Domain/Repositories/IHojaRutaRepository';
import {
  HojaRutaNoEncontradaException,
  HojaRutaInvalidaException,
} from '../../Domain/Exceptions/HojaRutaException';

interface HojaRutaRow {
  Id: number;
  UsuarioCreadorId: string | null;
  Fecha: string;
  Estado: string;
  TipoGeneracion: string | null;
  Observaciones: string | null;
  CreatedAt: string | null;
}

export class SupabaseHojaRutaRepository implements IHojaRutaRepository {
  private readonly TABLA_HOJAS_RUTA = 'HojasRuta';

  async obtenerTodas(filtros?: HojaRutaFiltros): Promise<HojaRuta[]> {
    let query = supabase.from(this.TABLA_HOJAS_RUTA).select('*');

    if (filtros?.fecha) {
      query = query.eq('Fecha', filtros.fecha);
    }
    if (filtros?.estado) {
      query = query.eq('Estado', filtros.estado);
    }

    const { data, error } = await query.order('Fecha', { ascending: false });
    if (error) throw new Error(`Error al obtener hojas de ruta: ${error.message}`);
    return ((data ?? []) as HojaRutaRow[]).map((fila) => this.mapearHojaRuta(fila));
  }

  async obtenerPorId(id: number): Promise<HojaRuta | null> {
    const { data, error } = await supabase
      .from(this.TABLA_HOJAS_RUTA)
      .select('*')
      .eq('Id', id)
      .maybeSingle();

    if (error) throw new Error(`Error al obtener hoja de ruta: ${error.message}`);
    return data ? this.mapearHojaRuta(data as HojaRutaRow) : null;
  }

  async obtenerPorFecha(fecha: string): Promise<HojaRuta | null> {
    const { data, error } = await supabase
      .from(this.TABLA_HOJAS_RUTA)
      .select('*')
      .eq('Fecha', fecha)
      .maybeSingle();

    if (error) throw new Error(`Error al obtener hoja de ruta por fecha: ${error.message}`);
    return data ? this.mapearHojaRuta(data as HojaRutaRow) : null;
  }

  async crear(hojaRuta: HojaRuta): Promise<HojaRuta> {
    if (!hojaRuta.esValida()) {
      throw new HojaRutaInvalidaException();
    }

    const { data, error } = await supabase
      .from(this.TABLA_HOJAS_RUTA)
      .insert([this.mapearHojaRutaAFila(hojaRuta)])
      .select()
      .single();

    if (error) throw new Error(`Error al crear hoja de ruta: ${error.message}`);
    return this.mapearHojaRuta(data as HojaRutaRow);
  }

  async actualizar(id: number, cambios: Partial<HojaRuta>): Promise<HojaRuta> {
    const actual = await this.obtenerPorId(id);
    if (!actual) throw new HojaRutaNoEncontradaException(id);

    const actualizada = new HojaRuta(
      cambios.fecha ?? actual.fecha,
      cambios.estado ?? actual.estado,
    );
    actualizada.id = id;
    actualizada.usuarioCreadorId = cambios.usuarioCreadorId ?? actual.usuarioCreadorId;
    actualizada.tipoGeneracion = cambios.tipoGeneracion ?? actual.tipoGeneracion;
    actualizada.observaciones = cambios.observaciones ?? actual.observaciones;

    if (!actualizada.esValida()) {
      throw new HojaRutaInvalidaException();
    }

    const { data, error } = await supabase
      .from(this.TABLA_HOJAS_RUTA)
      .update(this.mapearHojaRutaAFila(actualizada))
      .eq('Id', id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar hoja de ruta: ${error.message}`);
    return this.mapearHojaRuta(data as HojaRutaRow);
  }

  async cambiarEstado(id: number, nuevoEstado: EstadoHojaRuta): Promise<HojaRuta> {
    const { data, error } = await supabase
      .from(this.TABLA_HOJAS_RUTA)
      .update({ Estado: nuevoEstado })
      .eq('Id', id)
      .select()
      .single();

    if (error) throw new Error(`Error al cambiar estado de la hoja de ruta: ${error.message}`);
    return this.mapearHojaRuta(data as HojaRutaRow);
  }

  private mapearHojaRuta(fila: HojaRutaRow): HojaRuta {
    const hojaRuta = new HojaRuta(
      fila.Fecha,
      (fila.Estado ?? EstadoHojaRuta.BORRADOR) as EstadoHojaRuta,
    );
    hojaRuta.id = fila.Id;
    hojaRuta.usuarioCreadorId = fila.UsuarioCreadorId ?? undefined;
    hojaRuta.tipoGeneracion = fila.TipoGeneracion ?? 'Manual';
    hojaRuta.observaciones = fila.Observaciones ?? undefined;
    hojaRuta.createdAt = fila.CreatedAt ? new Date(fila.CreatedAt) : undefined;
    return hojaRuta;
  }

  private mapearHojaRutaAFila(hojaRuta: HojaRuta) {
    return {
      UsuarioCreadorId: hojaRuta.usuarioCreadorId ?? null,
      Fecha: hojaRuta.fecha,
      Estado: hojaRuta.estado,
      TipoGeneracion: hojaRuta.tipoGeneracion,
      Observaciones: hojaRuta.observaciones ?? null,
    };
  }
}
