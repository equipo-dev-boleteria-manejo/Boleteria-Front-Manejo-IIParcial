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

export class FrecuenciaInactivaException extends FrecuenciaException {
  constructor(frecuenciaId: number) {
    super(`La frecuencia ${frecuenciaId} está inactiva y no admite asignaciones`, 'FRECUENCIA_INACTIVE');
  }
}

export class FrecuenciaNoOperaEnFechaException extends FrecuenciaException {
  constructor(frecuenciaId: number, fecha: string, dia: string) {
    super(`La frecuencia ${frecuenciaId} no opera los días ${dia} (fecha ${fecha})`, 'FRECUENCIA_NOT_OPERATING');
  }
}

export class AsignacionBusInvalidaException extends FrecuenciaException {
  constructor(mensaje: string) {
    super(mensaje, 'ASIGNACION_BUS_INVALID');
  }
}

export class BusNoPerteneceACooperativaException extends FrecuenciaException {
  constructor(busId: number, cooperativaId: number) {
    super(`El bus ${busId} no pertenece a la cooperativa ${cooperativaId} dueña de la frecuencia`, 'BUS_COOPERATIVA_MISMATCH');
  }
}

export class ConflictoHorarioBusException extends FrecuenciaException {
  constructor(busId: number, fecha: string, horaSalida: string) {
    super(`El bus ${busId} ya tiene un viaje que se cruza con la salida de las ${horaSalida} del ${fecha}`, 'BUS_SCHEDULE_CONFLICT');
  }
}
