/**
 * IAbordajeBoletosRepository.ts - Contrato mínimo para validar boletos y registrar el abordaje
 *
 * Interfaz estrecha (Segregación de Interfaces): el abordaje solo necesita buscar un boleto por su código
 * y marcarlo como abordado, sin depender de todo IBoletosRepository (ventas, pagos, asientos).
 */

import type { Boleto } from '../Entities/Boleto';

export interface IAbordajeBoletosRepository {
  /** Busca un boleto por su código QR o de barras; devuelve null si no existe. */
  obtenerPorCodigo(codigo: string): Promise<Boleto | null>;

  /**
   * Marca el boleto como abordado. Debe fallar si el boleto ya no está habilitado para abordar
   * (por ejemplo, porque otro dispositivo lo validó un instante antes).
   */
  marcarAbordado(id: number): Promise<void>;
}
