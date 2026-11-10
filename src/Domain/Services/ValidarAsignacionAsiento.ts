/**
 * ValidarAsignacionAsiento.ts - Servicio de dominio para validar paradas según el tipo de ruta
 */

import { AsignacionAsientoInvalidaException } from '../Exceptions/AsientoException';

export interface ValidarAsientoInput {
  rutaTipoDirecta: boolean;           // true si la frecuencia/ruta es directa
  paradaDestinoId: number | string;   // ID de la parada donde baja el pasajero
  terminalDestinoId: number | string; // ID de la terminal final real del bus
}

export class ValidarAsignacionAsiento {
  /**
   * REGLA DE NEGOCIO: Si la ruta es Directa, el destino DEBE ser la terminal final.
   * No se permiten paradas intermedias para bajar pasajeros en frecuencias directas.
   */
  public static esAsignacionValida(input: ValidarAsientoInput): boolean {
    if (input.rutaTipoDirecta && input.paradaDestinoId !== input.terminalDestinoId) {
      return false;
    }
    return true;
  }

  /**
   * Valida la asignación y lanza una excepción explícita si la regla de negocio se viola.
   */
  public static validar(input: ValidarAsientoInput): void {
    if (!this.esAsignacionValida(input)) {
      throw new AsignacionAsientoInvalidaException(
        'Las rutas de tipo directa solo permiten como destino la terminal final.'
      );
    }
  }
}
