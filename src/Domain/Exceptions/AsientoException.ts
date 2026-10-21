/**
 * AsientoException.ts - Excepciones de dominio para Asientos
 */

import { DomainException } from './DomainException';

export class AsientoException extends DomainException {
  constructor(message: string, code: string = 'ASIENTO_ERROR') {
    super(`[AsientoException] ${message}`, code);
  }
}

export class AsientoNoDisponibleException extends AsientoException {
  constructor(numeroAsiento: string) {
    super(`El asiento ${numeroAsiento} no está disponible`, 'ASIENTO_NOT_AVAILABLE');
  }
}

export class AsientoNoEncontradoException extends AsientoException {
  constructor(asientoId: number | string) {
    super(`Asiento con ID ${asientoId} no encontrado`, 'ASIENTO_NOT_FOUND');
  }
}

export class NumeroAsientoDuplicadoException extends AsientoException {
  constructor(numeroAsiento: string, busId: number | string) {
    super(`El asiento ${numeroAsiento} ya existe en el bus ${busId}`, 'ASIENTO_DUPLICATED');
  }
}

export class AsignacionAsientoInvalidaException extends AsientoException {
  constructor(mensaje?: string) {
    super(
      mensaje || 'Las rutas de tipo directa solo permiten como destino la terminal final.',
      'ASIGNACION_ASIENTO_INVALIDA'
    );
  }
}
