/**
 * SupabaseSeatTypeRepository.ts - Implementación de ISeatTypeRepository con Supabase
 * Alineado estrictamente con la tabla "SeatTypes" del esquema oficial.
 */

import { supabase } from '../Api/supabaseClient';
import { SeatType } from '../../Domain/Entities/SeatType';
import type { ISeatTypeRepository } from '../../Domain/Repositories/ISeatTypeRepository';
import {
  SeatTypeNoEncontradoException,
  SeatTypeInvalidoException,
  NombreSeatTypeDuplicadoException,
} from '../../Domain/Exceptions/SeatTypeException';

interface SeatTypeRow {
  Id: number;
  Nombre: string;
  ColorHex: string;
  PrecioBase: number | string;
  Descripcion: string | null;
  Estado: boolean;
}

export class SupabaseSeatTypeRepository implements ISeatTypeRepository {
  private readonly TABLA_SEAT_TYPES = 'SeatTypes';

  async obtenerTodos(): Promise<SeatType[]> {
    const { data, error } = await supabase
      .from(this.TABLA_SEAT_TYPES)
      .select('*')
      .order('Nombre', { ascending: true });

    if (error) throw new Error(`Error al obtener tipos de asientos: ${error.message}`);
    return ((data ?? []) as SeatTypeRow[]).map((fila) => this.mapearSeatType(fila));
  }

  async obtenerActivos(): Promise<SeatType[]> {
    const { data, error } = await supabase
      .from(this.TABLA_SEAT_TYPES)
      .select('*')
      .eq('Estado', true)
      .order('PrecioBase', { ascending: true });

    if (error) throw new Error(`Error al obtener tipos de asientos activos: ${error.message}`);
    return ((data ?? []) as SeatTypeRow[]).map((fila) => this.mapearSeatType(fila));
  }

  async obtenerPorId(id: number): Promise<SeatType | null> {
    const { data, error } = await supabase
      .from(this.TABLA_SEAT_TYPES)
      .select('*')
      .eq('Id', id)
      .maybeSingle();

    if (error) throw new Error(`Error al obtener tipo de asiento: ${error.message}`);
    return data ? this.mapearSeatType(data as SeatTypeRow) : null;
  }

  async obtenerPorNombre(nombre: string): Promise<SeatType | null> {
    const { data, error } = await supabase
      .from(this.TABLA_SEAT_TYPES)
      .select('*')
      .ilike('Nombre', nombre.trim())
      .maybeSingle();

    if (error) throw new Error(`Error al obtener tipo de asiento por nombre: ${error.message}`);
    return data ? this.mapearSeatType(data as SeatTypeRow) : null;
  }

  async existeNombre(nombre: string, excludeId?: number): Promise<boolean> {
    let query = supabase
      .from(this.TABLA_SEAT_TYPES)
      .select('Id')
      .ilike('Nombre', nombre.trim());

    if (excludeId !== undefined) {
      query = query.neq('Id', excludeId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Error al verificar nombre de tipo de asiento: ${error.message}`);
    return (data ?? []).length > 0;
  }

  async crear(seatType: SeatType): Promise<SeatType> {
    if (!seatType.esValido()) {
      throw new SeatTypeInvalidoException();
    }

    const existe = await this.existeNombre(seatType.nombre);
    if (existe) {
      throw new NombreSeatTypeDuplicadoException(seatType.nombre);
    }

    const { data, error } = await supabase
      .from(this.TABLA_SEAT_TYPES)
      .insert([this.mapearSeatTypeAFila(seatType)])
      .select()
      .single();

    if (error) throw new Error(`Error al crear tipo de asiento: ${error.message}`);
    return this.mapearSeatType(data as SeatTypeRow);
  }

  async actualizar(id: number, cambios: Partial<SeatType>): Promise<SeatType> {
    const actual = await this.obtenerPorId(id);
    if (!actual) throw new SeatTypeNoEncontradoException(id);

    if (cambios.nombre && cambios.nombre.trim() !== actual.nombre) {
      const existe = await this.existeNombre(cambios.nombre, id);
      if (existe) {
        throw new NombreSeatTypeDuplicadoException(cambios.nombre);
      }
    }

    const actualizado = new SeatType(
      cambios.nombre ?? actual.nombre,
      cambios.colorHex ?? actual.colorHex,
      cambios.precioBase ?? actual.precioBase,
      cambios.descripcion ?? actual.descripcion,
      cambios.estado ?? actual.estado,
    );
    actualizado.id = id;

    if (!actualizado.esValido()) {
      throw new SeatTypeInvalidoException();
    }

    const { data, error } = await supabase
      .from(this.TABLA_SEAT_TYPES)
      .update(this.mapearSeatTypeAFila(actualizado))
      .eq('Id', id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar tipo de asiento: ${error.message}`);
    return this.mapearSeatType(data as SeatTypeRow);
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await supabase
      .from(this.TABLA_SEAT_TYPES)
      .update({ Estado: false })
      .eq('Id', id);

    if (error) throw new Error(`Error al desactivar tipo de asiento: ${error.message}`);
  }

  private mapearSeatType(fila: SeatTypeRow): SeatType {
    const seatType = new SeatType(
      fila.Nombre,
      fila.ColorHex,
      Number(fila.PrecioBase ?? 0),
      fila.Descripcion ?? undefined,
      fila.Estado,
    );
    seatType.id = fila.Id;
    return seatType;
  }

  private mapearSeatTypeAFila(seatType: SeatType) {
    return {
      Nombre: seatType.nombre.trim(),
      ColorHex: seatType.colorHex.toUpperCase().trim(),
      PrecioBase: seatType.precioBase,
      Descripcion: seatType.descripcion ?? null,
      Estado: seatType.estado,
    };
  }
}
