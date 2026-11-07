/**
 * IAsientoRepository.ts - Contrato de persistencia para el mapa de asientos
 */

import type { Asiento } from '../Entities/Asiento';

export interface IAsientoRepository {
  obtenerPorBus(busId: number): Promise<Asiento[]>;
  obtenerPorId(id: number): Promise<Asiento | null>;
  crear(asiento: Asiento): Promise<Asiento>;
  crearMasivo(asientos: Asiento[]): Promise<Asiento[]>;
  actualizarDisponibilidad(id: number, disponible: boolean): Promise<void>;
  /**
   * Devuelve el mapa de asientos del bus. Si el bus aún no tiene asientos
   * configurados, genera un diseño por defecto a partir de su capacidad.
   */
  asegurarAsientosDeBus(
    busId: number,
    totalAsientos: number,
    estructura?: string,
  ): Promise<Asiento[]>;
}
