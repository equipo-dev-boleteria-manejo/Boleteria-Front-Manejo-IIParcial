/**
 * ISeatTypeRepository.ts - Contrato de persistencia para Tipos de Asiento y Tarifas
 */

import type { SeatType } from '../Entities/SeatType';

export interface ISeatTypeRepository {
  obtenerTodos(): Promise<SeatType[]>;
  obtenerActivos(): Promise<SeatType[]>;
  obtenerPorId(id: number): Promise<SeatType | null>;
  obtenerPorNombre(nombre: string): Promise<SeatType | null>;
  crear(seatType: SeatType): Promise<SeatType>;
  actualizar(id: number, cambios: Partial<SeatType>): Promise<SeatType>;
  eliminar(id: number): Promise<void>;
  existeNombre(nombre: string, excludeId?: number): Promise<boolean>;
}
