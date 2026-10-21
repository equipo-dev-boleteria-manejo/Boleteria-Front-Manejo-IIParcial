/**
 * SupabaseDashboardRepository.ts - Implementación de IDashboardRepository con Supabase
 * Consolida métricas de alto nivel para el panel de administración.
 */

import { supabase } from '../Api/supabaseClient';
import type {
  IDashboardRepository,
  MetricasDashboard,
} from '../../Domain/Repositories/IDashboardRepository';
import { EstadoBus } from '../../Domain/Constants/EstadosSistema';

export class SupabaseDashboardRepository implements IDashboardRepository {
  async obtenerMetricas(): Promise<MetricasDashboard> {
    const hoyStr = new Date().toISOString().split('T')[0];
    const hoyInicioIso = `${hoyStr}T00:00:00.000Z`;

    // 1. Total de usuarios
    const { count: usuariosCount } = await supabase
      .from('Usuarios')
      .select('*', { count: 'exact', head: true });

    // 2. Total de buses activos
    const { count: busesCount } = await supabase
      .from('Buses')
      .select('*', { count: 'exact', head: true })
      .eq('Estado', EstadoBus.ACTIVO);

    // 3. Rutas de hoy
    const { count: rutasCount } = await supabase
      .from('Rutas')
      .select('*', { count: 'exact', head: true })
      .eq('Fecha', hoyStr);

    // 4. Ventas del día
    const { data: ventasData } = await supabase
      .from('Ventas')
      .select('Total')
      .gte('FechaVenta', hoyInicioIso);

    const totalVentas = (ventasData || []).reduce(
      (acc, item: { Total: number | string }) => acc + Number(item.Total || 0),
      0,
    );

    // 5. Boletos emitidos hoy
    const { count: boletosCount } = await supabase
      .from('Boletos')
      .select('*', { count: 'exact', head: true })
      .gte('CreatedAt', hoyInicioIso);

    return {
      totalUsuarios: usuariosCount ?? 0,
      totalBusesActivos: busesCount ?? 0,
      totalRutasHoy: rutasCount ?? 0,
      ventasDelDia: Number(totalVentas.toFixed(2)),
      boletosEmitidosHoy: boletosCount ?? 0,
    };
  }
}
