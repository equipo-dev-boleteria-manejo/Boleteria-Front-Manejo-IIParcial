export interface ITicketRepository {
  /**
   * Devuelve los boletos reales del usuario.
   * Se identifica al pasajero por su cédula (campo CedulaPasajero en Boletos).
   */
  obtenerBoletosPorUsuario(cedula: string): Promise<any[]>
}