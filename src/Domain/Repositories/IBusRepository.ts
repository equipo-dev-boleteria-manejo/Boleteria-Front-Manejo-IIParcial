/**
 * IBusRepository.ts - Contrato de persistencia para la gestión de flota de buses
 * Responsabilidad Única: Catálogo, registro y estado operativo del vehículo físico.
 */

import type { Bus } from '../Entities/Bus';
import type { EstadoBus } from '../Constants/EstadosSistema';

export interface IBusRepository {
  obtenerTodos(): Promise<Bus[]>;
  obtenerPorCooperativa(cooperativaId: number): Promise<Bus[]>;
  obtenerDisponiblesParaOperar(cooperativaId: number): Promise<Bus[]>;
  obtenerPorId(id: number): Promise<Bus | null>;
  obtenerPorPlaca(placa: string): Promise<Bus | null>;
  obtenerPorNumero(cooperativaId: number, numero: string): Promise<Bus | null>;
  crear(bus: Bus): Promise<Bus>;
  actualizar(id: number, bus: Partial<Bus>): Promise<Bus>;
  cambiarEstado(id: number, nuevoEstado: EstadoBus): Promise<Bus>;
  eliminarLogico(id: number): Promise<void>;
}
