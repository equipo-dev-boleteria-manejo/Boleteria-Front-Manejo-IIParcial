/**
 * FrecuenciaException.ts - Excepciones de dominio para el módulo de Frecuencias y Paradas
 */

import { DomainException } from './DomainException';

export class FrecuenciaException extends DomainException {
  constructor(message: string, code: string = 'FRECUENCIA_ERROR') {
    super(`[FrecuenciaException] ${message}`, code);
  }
}

export class FrecuenciaNoEncontradaException extends FrecuenciaException {
  constructor(frecuenciaId: number) {
    super(`Frecuencia con ID ${frecuenciaId} no encontrada`, 'FRECUENCIA_NOT_FOUND');
  }
}

export class FrecuenciaInvalidaException extends FrecuenciaException {
  constructor(mensaje?: string) {
    super(
      mensaje || 'La frecuencia contiene datos inválidos. Verifica origen, destino, hora, identificador, días y paradas',
      'FRECUENCIA_INVALID'
    );
  }
}

export class IdentificadorFrecuenciaDuplicadoException extends FrecuenciaException {
  constructor(identificador: string, cooperativaId: number) {
    super(
      `El identificador ${identificador} ya existe para la cooperativa ${cooperativaId}`,
      'IDENTIFICADOR_FRECUENCIA_DUPLICATED'
    );
  }
}

export class ParadaNoEncontradaException extends FrecuenciaException {
  constructor(paradaId: number) {
    super(`Parada con ID ${paradaId} no encontrada`, 'PARADA_NOT_FOUND');
  }
}

export class ParadaInvalidaException extends FrecuenciaException {
  constructor(mensaje?: string) {
    super(
      mensaje || 'La parada es inválida o su orden/tiempo es inconsistente con las demás paradas',
      'PARADA_INVALID'
    );
  }
}
