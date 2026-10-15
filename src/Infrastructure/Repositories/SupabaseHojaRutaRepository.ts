import { supabase } from '../Api/supabaseClient';
import { HojaRuta } from '../../Domain/Entities/HojaRuta';
import { IHojaRutaRepository } from '../../Domain/Repositories/IHojaRutaRepository';

export class SupabaseHojaRutaRepository implements IHojaRutaRepository {
  async obtenerTodas(): Promise<HojaRuta[]> {
    const { data, error } = await supabase.from('hojas_ruta').select('*');
    if (error) throw new Error(error.message);
    return data as HojaRuta[];
  }

  async obtenerPorId(id: string): Promise<HojaRuta | null> {
    const { data, error } = await supabase.from('hojas_ruta').select('*').eq('id', id).single();
    if (error) return null;
    return data as HojaRuta;
  }

  async crear(hojaRuta: HojaRuta): Promise<HojaRuta> {
    const { data, error } = await supabase.from('hojas_ruta').insert([hojaRuta]).select().single();
    if (error) throw new Error(error.message);
    return data as HojaRuta;
  }

  async actualizar(id: string, hojaRuta: Partial<HojaRuta>): Promise<boolean> {
    const { error } = await supabase.from('hojas_ruta').update(hojaRuta).eq('id', id);
    return !error;
  }

  async eliminar(id: string): Promise<boolean> {
    const { error } = await supabase.from('hojas_ruta').delete().eq('id', id);
    return !error;
  }
}
