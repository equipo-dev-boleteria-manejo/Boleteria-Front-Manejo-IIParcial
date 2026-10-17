/**
 * ISeatTypeRepository.ts - Contrato de repositorio para Tipos de Asientos
 */

import { SeatType } from '../Entities/SeatType';

export interface ISeatTypeRepository {
  obtenerTodos(): Promise<SeatType[]>;
  obtenerActivos(): Promise<SeatType[]>;
  obtenerPorId(id: number): Promise<SeatType | null>;
  obtenerPorNombre(nombre: string): Promise<SeatType | null>;
  crear(seatType: SeatType): Promise<SeatType>;
  actualizar(seatType: SeatType): Promise<SeatType>;
  eliminar(id: number): Promise<void>;
  existeNombre(nombre: string, excludeId?: number): Promise<boolean>;
  obtenerMasUsados(limit?: number): Promise<SeatType[]>;
}