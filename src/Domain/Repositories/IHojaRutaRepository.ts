/**
 * IHojaRutaRepository.ts - Contrato de persistencia para Hojas de Ruta
 */

import type { HojaRuta } from '../Entities/HojaRuta';
import type { EstadoHojaRuta } from '../Constants/EstadosSistema';

export interface HojaRutaFiltros {
  fecha?: string;
  estado?: EstadoHojaRuta;
}

export interface IHojaRutaRepository {
  obtenerTodas(filtros?: HojaRutaFiltros): Promise<HojaRuta[]>;
  obtenerPorId(id: number): Promise<HojaRuta | null>;
  obtenerPorFecha(fecha: string): Promise<HojaRuta | null>;
  crear(hojaRuta: HojaRuta): Promise<HojaRuta>;
  actualizar(id: number, cambios: Partial<HojaRuta>): Promise<HojaRuta>;
  cambiarEstado(id: number, nuevoEstado: EstadoHojaRuta): Promise<HojaRuta>;
}
