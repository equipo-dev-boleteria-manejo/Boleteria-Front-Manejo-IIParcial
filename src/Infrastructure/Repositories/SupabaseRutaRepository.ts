/**
 * SupabaseRutaRepository.ts - Implementación de IRutaRepository con Supabase
 * Alineado estrictamente con la tabla "Rutas" del esquema oficial (Viajes Operativos).
 */

import { supabase } from '../Api/supabaseClient';
import { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import type {
  RutaFiltros,
  IRutaRepository,
} from '../../Domain/Repositories/IRutaRepository';
import {
  RutaNoEncontradaException,
  RutaInvalidaException,
} from '../../Domain/Exceptions/RutaException';

interface RutaRow {
  Id: number;
  FrecuenciaId: number;
  BusId: number;
  ChoferId: string | null;
  HojaRutaId: number | null;
  Fecha: string;
  HoraSalida: string | null;
  HoraLlegada: string | null;
  Estado: string;
  EsDirecta: boolean;
  ObservacionChofer: string | null;
  TiempoViajeMinutos: number | null;
  CreatedAt: string | null;
}

export class SupabaseRutaRepository implements IRutaRepository {
  private readonly TABLA_RUTAS = 'Rutas';

  async obtenerTodas(filtros?: RutaFiltros): Promise<Ruta[]> {
    let query = supabase.from(this.TABLA_RUTAS).select('*');

    if (filtros?.fecha) {
      query = query.eq('Fecha', filtros.fecha);
    }
    if (filtros?.frecuenciaId) {
      query = query.eq('FrecuenciaId', filtros.frecuenciaId);
    }
    if (filtros?.busId) {
      query = query.eq('BusId', filtros.busId);
    }
    if (filtros?.choferId) {
      query = query.eq('ChoferId', filtros.choferId);
    }
    if (filtros?.hojaRutaId) {
      query = query.eq('HojaRutaId', filtros.hojaRutaId);
    }
    if (filtros?.estado) {
      query = query.eq('Estado', filtros.estado);
    }

    const { data, error } = await query
      .order('Fecha', { ascending: true })
      .order('HoraSalida', { ascending: true });

    if (error) throw new Error(`Error al obtener rutas: ${error.message}`);
    return ((data ?? []) as RutaRow[]).map((fila) => this.mapearRuta(fila));
  }

  async obtenerPorId(id: number): Promise<Ruta | null> {
    const { data, error } = await supabase
      .from(this.TABLA_RUTAS)
      .select('*')
      .eq('Id', id)
      .maybeSingle();

    if (error) throw new Error(`Error al obtener ruta: ${error.message}`);
    return data ? this.mapearRuta(data as RutaRow) : null;
  }

  async obtenerPorHojaRuta(hojaRutaId: number): Promise<Ruta[]> {
    return this.obtenerTodas({ hojaRutaId });
  }

  async obtenerPorBusYFecha(busId: number, fecha: string): Promise<Ruta[]> {
    return this.obtenerTodas({ busId, fecha });
  }

  async obtenerPorChoferYFecha(choferId: string, fecha: string): Promise<Ruta[]> {
    return this.obtenerTodas({ choferId, fecha });
  }

  async crear(ruta: Ruta): Promise<Ruta> {
    if (!ruta.esValida()) {
      throw new RutaInvalidaException();
    }

    const { data, error } = await supabase
      .from(this.TABLA_RUTAS)
      .insert([this.mapearRutaAFila(ruta)])
      .select()
      .single();

    if (error) throw new Error(`Error al crear ruta: ${error.message}`);
    return this.mapearRuta(data as RutaRow);
  }

  async actualizar(id: number, cambios: Partial<Ruta>): Promise<Ruta> {
    const actual = await this.obtenerPorId(id);
    if (!actual) throw new RutaNoEncontradaException(id);

    const actualizada = new Ruta(
      cambios.frecuenciaId ?? actual.frecuenciaId,
      cambios.busId ?? actual.busId,
      cambios.fecha ?? actual.fecha,
      cambios.estado ?? actual.estado,
    );
    actualizada.id = id;
    actualizada.choferId = cambios.choferId ?? actual.choferId;
    actualizada.hojaRutaId = cambios.hojaRutaId ?? actual.hojaRutaId;
    actualizada.horaSalida = cambios.horaSalida ?? actual.horaSalida;
    actualizada.horaLlegada = cambios.horaLlegada ?? actual.horaLlegada;
    actualizada.esDirecta = cambios.esDirecta ?? actual.esDirecta;
    actualizada.observacionChofer = cambios.observacionChofer ?? actual.observacionChofer;
    actualizada.tiempoViajeMinutos = cambios.tiempoViajeMinutos ?? actual.tiempoViajeMinutos;

    if (!actualizada.esValida()) {
      throw new RutaInvalidaException();
    }

    const { data, error } = await supabase
      .from(this.TABLA_RUTAS)
      .update(this.mapearRutaAFila(actualizada))
      .eq('Id', id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar ruta: ${error.message}`);
    return this.mapearRuta(data as RutaRow);
  }

  async cambiarEstado(id: number, nuevoEstado: EstadoRuta): Promise<Ruta> {
    const { data, error } = await supabase
      .from(this.TABLA_RUTAS)
      .update({ Estado: nuevoEstado })
      .eq('Id', id)
      .select()
      .single();

    if (error) throw new Error(`Error al cambiar estado de la ruta: ${error.message}`);
    return this.mapearRuta(data as RutaRow);
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await supabase
      .from(this.TABLA_RUTAS)
      .delete()
      .eq('Id', id);

    if (error) throw new Error(`Error al eliminar ruta: ${error.message}`);
  }

  private mapearRuta(fila: RutaRow): Ruta {
    const ruta = new Ruta(
      fila.FrecuenciaId,
      fila.BusId,
      fila.Fecha,
      (fila.Estado ?? EstadoRuta.PROGRAMADA) as EstadoRuta,
    );
    ruta.id = fila.Id;
    ruta.choferId = fila.ChoferId ?? undefined;
    ruta.hojaRutaId = fila.HojaRutaId ?? undefined;
    ruta.horaSalida = fila.HoraSalida ? fila.HoraSalida.slice(0, 5) : undefined;
    ruta.horaLlegada = fila.HoraLlegada ? fila.HoraLlegada.slice(0, 5) : undefined;
    ruta.esDirecta = fila.EsDirecta;
    ruta.observacionChofer = fila.ObservacionChofer ?? undefined;
    ruta.tiempoViajeMinutos = fila.TiempoViajeMinutos ?? undefined;
    ruta.createdAt = fila.CreatedAt ? new Date(fila.CreatedAt) : undefined;
    return ruta;
  }

  private mapearRutaAFila(ruta: Ruta) {
    return {
      FrecuenciaId: ruta.frecuenciaId,
      BusId: ruta.busId,
      ChoferId: ruta.choferId ?? null,
      HojaRutaId: ruta.hojaRutaId ?? null,
      Fecha: ruta.fecha,
      HoraSalida: ruta.horaSalida ?? null,
      HoraLlegada: ruta.horaLlegada ?? null,
      Estado: ruta.estado,
      EsDirecta: ruta.esDirecta,
      ObservacionChofer: ruta.observacionChofer ?? null,
      TiempoViajeMinutos: ruta.tiempoViajeMinutos ?? null,
    };
  }
}
