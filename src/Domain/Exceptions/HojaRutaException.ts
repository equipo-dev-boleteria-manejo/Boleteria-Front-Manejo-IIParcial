/**
 * HojaRutaException.ts - Excepciones de dominio para la gestión de Hojas de Ruta
 */

import { DomainException } from './DomainException';

export class HojaRutaException extends DomainException {
  constructor(message: string, code: string = 'HOJA_RUTA_ERROR') {
    super(`[HojaRutaException] ${message}`, code);
  }
}

export class HojaRutaNoEncontradaException extends HojaRutaException {
  constructor(id: number) {
    super(`Hoja de ruta con ID ${id} no encontrada`, 'HOJA_RUTA_NOT_FOUND');
  }
}

export class HojaRutaInvalidaException extends HojaRutaException {
  constructor(mensaje?: string) {
    super(mensaje || 'Los datos de la hoja de ruta son inválidos. Verifica la fecha y el estado', 'HOJA_RUTA_INVALID');
  }
}

export class HojaRutaYaCerradaException extends HojaRutaException {
  constructor(id: number) {
    super(`La hoja de ruta ${id} ya se encuentra cerrada y no permite modificaciones`, 'HOJA_RUTA_ALREADY_CLOSED');
  }
}

export class FechaHojaRutaInvalidaException extends HojaRutaException {
  constructor(mensaje: string = 'La fecha de salida es obligatoria y debe ser válida') {
    super(mensaje, 'FECHA_HOJA_RUTA_INVALIDA');
  }
}

