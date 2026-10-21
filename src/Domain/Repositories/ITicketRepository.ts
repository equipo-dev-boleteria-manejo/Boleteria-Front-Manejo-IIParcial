/**
 * ITicketRepository.ts - Contrato de Dominio para Consulta de Tickets/Boletos de Usuario
 */

import { Boleto } from '../Entities/Boleto';

export interface ITicketRepository {
  /**
   * Devuelve los boletos reales del usuario identificado por su cédula.
   */
  obtenerBoletosPorUsuario(cedula: string): Promise<Boleto[]>;
}
