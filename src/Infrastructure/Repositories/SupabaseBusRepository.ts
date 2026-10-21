/**
 * SupabaseBusRepository.ts - Implementación de IBusRepository con Supabase
 * Alineado estrictamente con el esquema oficial de base de datos (Buses)
 * y el contrato de dominio desacoplado.
 */

import { supabase } from '../Api/supabaseClient';
import { Bus, type EstructuraBus } from '../../Domain/Entities/Bus';
import { EstadoBus } from '../../Domain/Constants/EstadosSistema';
import type { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import {
  BusNoEncontradoException,
  BusInvalidoException,
  PlacaDuplicadaException,
} from '../../Domain/Exceptions/BusException';

export class SupabaseBusRepository implements IBusRepository {
  private readonly TABLA_BUSES = 'Buses';

  async obtenerTodos(): Promise<Bus[]> {
    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .select('*')
      .order('Numero', { ascending: true });

    if (error) throw new Error(`Error al obtener buses: ${error.message}`);
    return (data || []).map((item) => this.mapearBus(item));
  }

  async obtenerPorCooperativa(cooperativaId: number): Promise<Bus[]> {
    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .select('*')
      .eq('CooperativaId', cooperativaId)
      .order('Numero', { ascending: true });

    if (error) {
      throw new Error(`Error al obtener buses de la cooperativa: ${error.message}`);
    }

    return (data || []).map((item) => this.mapearBus(item));
  }

  async obtenerDisponiblesParaOperar(cooperativaId: number): Promise<Bus[]> {
    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .select('*')
      .eq('CooperativaId', cooperativaId)
      .eq('Estado', EstadoBus.ACTIVO)
      .order('Numero', { ascending: true });

    if (error) {
      throw new Error(`Error al obtener buses disponibles: ${error.message}`);
    }

    return (data || []).map((item) => this.mapearBus(item));
  }

  async obtenerPorId(id: number): Promise<Bus | null> {
    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .select('*')
      .eq('Id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener bus: ${error.message}`);
    }

    return data ? this.mapearBus(data) : null;
  }

  async obtenerPorPlaca(placa: string): Promise<Bus | null> {
    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .select('*')
      .eq('Placa', placa.toUpperCase().trim())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener bus por placa: ${error.message}`);
    }

    return data ? this.mapearBus(data) : null;
  }

  async obtenerPorNumero(cooperativaId: number, numero: string): Promise<Bus | null> {
    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .select('*')
      .eq('CooperativaId', cooperativaId)
      .eq('Numero', numero.trim())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener bus por número: ${error.message}`);
    }

    return data ? this.mapearBus(data) : null;
  }

  async crear(bus: Bus): Promise<Bus> {
    if (!bus.esValido()) {
      throw new BusInvalidoException();
    }

    const busExistente = await this.obtenerPorPlaca(bus.placa);
    if (busExistente) {
      throw new PlacaDuplicadaException(bus.placa);
    }

    const datosInsert = this.mapearBusADatos(bus);
    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .insert([datosInsert])
      .select()
      .single();

    if (error) throw new Error(`Error al crear bus: ${error.message}`);
    return this.mapearBus(data);
  }

  async actualizar(id: number, bus: Partial<Bus>): Promise<Bus> {
    const busActual = await this.obtenerPorId(id);
    if (!busActual) {
      throw new BusNoEncontradoException(id);
    }

    const busActualizado = new Bus(
      bus.cooperativaId ?? busActual.cooperativaId,
      bus.numero ?? busActual.numero,
      bus.placa ?? busActual.placa,
      bus.totalAsientos ?? busActual.totalAsientos,
      bus.estado ?? busActual.estado
    );
    busActualizado.id = id;
    busActualizado.marcaChasis = bus.marcaChasis ?? busActual.marcaChasis;
    busActualizado.marcaCarroceria = bus.marcaCarroceria ?? busActual.marcaCarroceria;
    busActualizado.anio = bus.anio ?? busActual.anio;
    busActualizado.fotoUrl = bus.fotoUrl ?? busActual.fotoUrl;
    busActualizado.estructura = bus.estructura ?? busActual.estructura;

    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .update(this.mapearBusADatos(busActualizado))
      .eq('Id', id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar bus: ${error.message}`);
    return this.mapearBus(data);
  }

  async cambiarEstado(id: number, nuevoEstado: EstadoBus): Promise<Bus> {
    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .update({ Estado: nuevoEstado })
      .eq('Id', id)
      .select()
      .single();

    if (error) throw new Error(`Error al cambiar estado del bus: ${error.message}`);
    return this.mapearBus(data);
  }

  async eliminarLogico(id: number): Promise<void> {
    const { error } = await supabase
      .from(this.TABLA_BUSES)
      .update({ Estado: EstadoBus.INACTIVO })
      .eq('Id', id);

    if (error) throw new Error(`Error al eliminar bus lógicamente: ${error.message}`);
  }

  private mapearBus(data: any): Bus {
    const bus = new Bus(
      data.CooperativaId ?? data.cooperativa_id,
      String(data.Numero ?? data.numero),
      data.Placa ?? data.placa,
      data.TotalAsientos ?? data.total_asientos ?? 0,
      (data.Estado ?? data.estado ?? EstadoBus.ACTIVO) as EstadoBus
    );

    bus.id = data.Id ?? data.id;
    bus.marcaChasis = data.MarcaChasis ?? data.marca_chasis;
    bus.marcaCarroceria = data.MarcaCarroceria ?? data.marca_carroceria;
    bus.anio = data.Anio ?? data.anio;
    bus.fotoUrl = data.FotoUrl ?? data.foto_url;
    bus.estructura = (data.Estructura ?? data.estructura ?? 'UnPiso') as EstructuraBus;
    const rawCreatedAt = data.CreatedAt ?? data.created_at;
    bus.createdAt = rawCreatedAt ? new Date(rawCreatedAt) : undefined;
    return bus;
  }

  private mapearBusADatos(bus: Bus) {
    return {
      CooperativaId: bus.cooperativaId,
      Numero: bus.numero.trim(),
      Placa: bus.placa.toUpperCase().trim(),
      TotalAsientos: bus.totalAsientos,
      MarcaChasis: bus.marcaChasis ?? null,
      MarcaCarroceria: bus.marcaCarroceria ?? null,
      Anio: bus.anio ?? null,
      FotoUrl: bus.fotoUrl ?? null,
      Estructura: bus.estructura ?? 'UnPiso',
      Estado: bus.estado,
    };
  }
}
