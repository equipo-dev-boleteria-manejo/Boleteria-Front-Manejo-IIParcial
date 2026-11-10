/**
 * BoletoException.ts - Excepciones de dominio para la gestión de Boletos
 */

import { DomainException } from './DomainException';

export class BoletoException extends DomainException {
  constructor(message: string, code: string = 'BOLETO_ERROR') {
    super(`[BoletoException] ${message}`, code);
  }
}

export class BoletoNoEncontradoException extends BoletoException {
  constructor(id: number) {
    super(`Boleto con ID ${id} no encontrado`, 'BOLETO_NOT_FOUND');
  }
}

export class BoletoInvalidoException extends BoletoException {
  constructor(mensaje?: string) {
    super(mensaje || 'Los datos del boleto son inválidos. Verifica venta, ruta, asiento y pasajero', 'BOLETO_INVALID');
  }
}

export class AsientoNoDisponibleException extends BoletoException {
  constructor(asientoId: number, rutaId: number) {
    super(`El asiento ${asientoId} ya no está disponible para la ruta ${rutaId}`, 'ASIENTO_NOT_AVAILABLE');
  }
}

export class BoletoNoModificableException extends BoletoException {
  constructor(id: number, estado: string) {
    super(`El boleto ${id} no puede modificarse en su estado actual: ${estado}`, 'BOLETO_NOT_MODIFIABLE');
  }
}
