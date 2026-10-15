import { supabase } from '../Api/supabaseClient';
import { Ruta } from '../../Domain/Entities/Ruta';
import { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';

export class SupabaseRutaRepository implements IRutaRepository {
  async obtenerTodas(): Promise<Ruta[]> {
    const { data, error } = await supabase.from('rutas').select('*');
    if (error) throw new Error(error.message);
    return data as Ruta[];
  }

  async obtenerPorId(id: string): Promise<Ruta | null> {
    const { data, error } = await supabase.from('rutas').select('*').eq('id', id).single();
    if (error) return null;
    return data as Ruta;
  }

  async crear(ruta: Ruta): Promise<Ruta> {
    const { data, error } = await supabase.from('rutas').insert([ruta]).select().single();
    if (error) throw new Error(error.message);
    return data as Ruta;
  }

  async actualizar(id: string, ruta: Partial<Ruta>): Promise<boolean> {
    const { error } = await supabase.from('rutas').update(ruta).eq('id', id);
    return !error;
  }

  async eliminar(id: string): Promise<boolean> {
    const { error } = await supabase.from('rutas').delete().eq('id', id);
    return !error;
  }
}
