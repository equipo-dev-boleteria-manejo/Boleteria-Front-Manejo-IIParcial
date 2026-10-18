/**
 * SupabaseBusRepository.ts - Implementación de IBusRepository con Supabase
 */

import { supabase } from './Api/supabaseClient';
import { Bus, BusAsiento } from '../Domain/Entities/Bus';
import { IBusRepository, BusFiltros } from '../Domain/Repositories/IBusRepository';
import {
  BusNoEncontradoException,
  BusInvalidoException,
  PlacaDuplicadaException,
} from '../Domain/Exceptions/BusException';

export class SupabaseBusRepository implements IBusRepository {
  private readonly TABLA_BUSES = 'buses';
  private readonly TABLA_ASIENTOS = 'asientos_bus';

  async obtenerTodos(): Promise<Bus[]> {
    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .select('*')
      .order('numero', { ascending: true });

    if (error) throw new Error(`Error al obtener buses: ${error.message}`);
    return (data || []).map((item) => this.mapearBus(item));
  }

  async obtenerPorCooperativa(cooperativaId: number): Promise<Bus[]> {
    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .select('*')
      .eq('cooperativa_id', cooperativaId)
      .eq('estado', true)
      .order('numero', { ascending: true });

    if (error) {
      throw new Error(`Error al obtener buses de la cooperativa: ${error.message}`);
    }

    return (data || []).map((item) => this.mapearBus(item));
  }

  async obtenerPorId(id: number): Promise<Bus | null> {
    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .select('*')
      .eq('id', id)
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
      .eq('placa', placa.toUpperCase())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener bus: ${error.message}`);
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

    const busCreado = this.mapearBus(data);
    await this.crearAsientosParaBus(busCreado.id!, bus.totalAsientos);
    return busCreado;
  }

  async actualizar(id: number, bus: Partial<Bus>): Promise<Bus> {
    const busActual = await this.obtenerPorId(id);
    if (!busActual) {
      throw new BusNoEncontradoException(String(id));
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

    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .update(this.mapearBusADatos(busActualizado))
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar bus: ${error.message}`);
    return this.mapearBus(data);
  }

  async eliminarLogico(id: number): Promise<void> {
    const { error } = await supabase
      .from(this.TABLA_BUSES)
      .update({ estado: false })
      .eq('id', id);

    if (error) throw new Error(`Error al eliminar bus: ${error.message}`);
  }

  async obtenerAsientos(busId: number): Promise<BusAsiento[]> {
    const { data, error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .select('*')
      .eq('bus_id', busId)
      .order('numero_asiento', { ascending: true });

    if (error) throw new Error(`Error al obtener asientos: ${error.message}`);
    return (data || []).map((item) => this.mapearAsiento(item));
  }

  async obtenerAsientosDisponibles(busId: number, tipo: 'NORMAL' | 'VIP'): Promise<BusAsiento[]> {
    const { data, error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .select('*')
      .eq('bus_id', busId)
      .eq('tipo', tipo)
      .eq('disponible', true)
      .order('numero_asiento', { ascending: true });

    if (error) {
      throw new Error(`Error al obtener asientos disponibles: ${error.message}`);
    }

    return (data || []).map((item) => this.mapearAsiento(item));
  }

  async actualizarAsiento(asiento: BusAsiento): Promise<BusAsiento> {
    if (!asiento.id) {
      throw new Error('El asiento debe tener un ID');
    }

    const { data, error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .update({
        disponible: asiento.disponible,
        pasajero_id: asiento.pasajeroId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', asiento.id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar asiento: ${error.message}`);
    return this.mapearAsiento(data);
  }

  async reservarAsientos(asientos: BusAsiento[]): Promise<void> {
    const actualizaciones = asientos.map((asiento) => ({
      id: asiento.id,
      disponible: false,
      pasajero_id: asiento.pasajeroId,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .upsert(actualizaciones, { onConflict: 'id' });

    if (error) throw new Error(`Error al reservar asientos: ${error.message}`);
  }

  async liberarAsientos(asientos: BusAsiento[]): Promise<void> {
    const asientosIds = asientos.map((asiento) => asiento.id);

    const { error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .update({
        disponible: true,
        pasajero_id: null,
        updated_at: new Date().toISOString(),
      })
      .in('id', asientosIds);

    if (error) throw new Error(`Error al liberar asientos: ${error.message}`);
  }

  async buscarDisponibles(
    ciudadOrigen: string,
    ciudadDestino: string,
    fecha: Date,
    filtros?: BusFiltros
  ): Promise<Bus[]> {
    let query = supabase
      .from(this.TABLA_BUSES)
      .select('*')
      .eq('estado', true);

    if (filtros?.cooperativaId) {
      query = query.eq('cooperativa_id', filtros.cooperativaId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Error al buscar buses: ${error.message}`);
    return (data || []).map((item) => this.mapearBus(item));
  }

  private async crearAsientosParaBus(busId: number, totalAsientos: number): Promise<void> {
    const asientos: any[] = [];

    for (let i = 1; i <= totalAsientos; i++) {
      asientos.push({
        bus_id: busId,
        numero_asiento: `${i}`,
        tipo: 'NORMAL',
        tipo_asiento_id: null,
        disponible: true,
      });
    }

    const { error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .insert(asientos);

    if (error) {
      console.error('Error al crear asientos:', error.message);
    }
  }

  private mapearBus(data: any): Bus {
    const bus = new Bus(
      data.cooperativa_id,
      String(data.numero),
      data.placa,
      data.total_asientos ?? 0,
      data.estado ? 'Activo' : 'Inactivo'
    );

    bus.id = data.id;
    bus.marcaChasis = data.marca_chasis;
    bus.marcaCarroceria = data.marca_carroceria;
    bus.anio = data.anio;
    bus.fotoUrl = data.foto_url;
    bus.createdAt = data.created_at ? new Date(data.created_at) : undefined;
    return bus;
  }

  private mapearBusADatos(bus: Bus) {
    return {
      numero: Number(bus.numero),
      placa: bus.placa.toUpperCase(),
      marca_chasis: bus.marcaChasis,
      marca_carroceria: bus.marcaCarroceria,
      anio: bus.anio,
      cooperativa_id: bus.cooperativaId,
      foto_url: bus.fotoUrl,
      total_asientos: bus.totalAsientos,
      estado: bus.estado === 'Activo',
      updated_at: new Date().toISOString(),
    };
  }

  private mapearAsiento(data: any): BusAsiento {
    const asiento = new BusAsiento(
      data.bus_id,
      data.tipo_asiento_id,
      data.numero_asiento,
      data.tipo
    );

    asiento.id = data.id;
    asiento.disponible = data.disponible;
    asiento.pasajeroId = data.pasajero_id;
    asiento.createdAt = data.created_at ? new Date(data.created_at) : undefined;
    asiento.updatedAt = data.updated_at ? new Date(data.updated_at) : undefined;
    return asiento;
  }
}
