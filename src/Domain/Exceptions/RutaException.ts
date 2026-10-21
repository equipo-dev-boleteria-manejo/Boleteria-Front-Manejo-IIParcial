/**
 * RutaException.ts - Excepciones de dominio para la gestión de Rutas (Viajes Operativos)
 */

import { DomainException } from './DomainException';

export class RutaException extends DomainException {
  constructor(message: string, code: string = 'RUTA_ERROR') {
    super(`[RutaException] ${message}`, code);
  }
}

export class RutaNoEncontradaException extends RutaException {
  constructor(id: number) {
    super(`Ruta / viaje operativo con ID ${id} no encontrado`, 'RUTA_NOT_FOUND');
  }
}

export class RutaInvalidaException extends RutaException {
  constructor(mensaje?: string) {
    super(mensaje || 'Los datos de la ruta son inválidos. Verifica frecuencia, bus, fecha y horario', 'RUTA_INVALID');
  }
}

export class RutaNoModificableException extends RutaException {
  constructor(id: number, estado: string) {
    super(`La ruta ${id} no puede modificarse en su estado actual: ${estado}`, 'RUTA_NOT_MODIFIABLE');
  }
}
