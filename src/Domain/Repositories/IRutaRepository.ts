/**
 * IRutaRepository.ts - Contrato de persistencia para Rutas (Viajes Operativos)
 */

import type { Ruta } from '../Entities/Ruta';
import type { EstadoRuta } from '../Constants/EstadosSistema';

export interface RutaFiltros {
  fecha?: string;
  frecuenciaId?: number;
  busId?: number;
  choferId?: string;
  hojaRutaId?: number;
  estado?: EstadoRuta;
}

export interface IRutaRepository {
  obtenerTodas(filtros?: RutaFiltros): Promise<Ruta[]>;
  obtenerPorId(id: number): Promise<Ruta | null>;
  obtenerPorHojaRuta(hojaRutaId: number): Promise<Ruta[]>;
  obtenerPorBusYFecha(busId: number, fecha: string): Promise<Ruta[]>;
  obtenerPorChoferYFecha(choferId: string, fecha: string): Promise<Ruta[]>;
  crear(ruta: Ruta): Promise<Ruta>;
  actualizar(id: number, cambios: Partial<Ruta>): Promise<Ruta>;
  cambiarEstado(id: number, nuevoEstado: EstadoRuta): Promise<Ruta>;
  eliminar(id: number): Promise<void>;
}
