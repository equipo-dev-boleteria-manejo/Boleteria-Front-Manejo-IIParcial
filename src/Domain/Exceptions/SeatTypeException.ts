/**
 * SeatTypeException.ts - Excepciones de dominio para Tipos de Asiento y Tarifas
 */

import { DomainException } from './DomainException';

export class SeatTypeException extends DomainException {
  constructor(message: string, code: string = 'SEAT_TYPE_ERROR') {
    super(`[SeatTypeException] ${message}`, code);
  }
}

export class SeatTypeNoEncontradoException extends SeatTypeException {
  constructor(seatTypeId: number | string) {
    super(`Tipo de asiento con ID ${seatTypeId} no encontrado`, 'SEAT_TYPE_NOT_FOUND');
  }
}

export class SeatTypeInvalidoException extends SeatTypeException {
  constructor(mensaje?: string) {
    super(
      mensaje || 'El tipo de asiento contiene datos inválidos. Verifica nombre, color hexadecimal y precio base',
      'SEAT_TYPE_INVALID'
    );
  }
}

export class ColorHexInvalidoException extends SeatTypeException {
  constructor(color: string) {
    super(`El color ${color} no es un hexadecimal válido (ej: #FF5733)`, 'COLOR_HEX_INVALID');
  }
}

export class NombreSeatTypeDuplicadoException extends SeatTypeException {
  constructor(nombre: string) {
    super(`Ya existe un tipo de asiento llamado "${nombre}"`, 'SEAT_TYPE_NAME_DUPLICATED');
  }
}

export class PrecioNegativoException extends SeatTypeException {
  constructor() {
    super('El precio del tipo de asiento no puede ser negativo', 'PRECIO_NEGATIVO');
  }
}

export class SeatTypeNoActivoException extends SeatTypeException {
  constructor(seatTypeId: number | string) {
    super(`El tipo de asiento ${seatTypeId} no está activo`, 'SEAT_TYPE_NOT_ACTIVE');
  }
}
