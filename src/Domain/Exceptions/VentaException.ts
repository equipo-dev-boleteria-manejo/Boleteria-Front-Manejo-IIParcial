/**
 * VentaException.ts - Excepciones de dominio para la gestión de Ventas
 */

import { DomainException } from './DomainException';

export class VentaException extends DomainException {
  constructor(message: string, code: string = 'VENTA_ERROR') {
    super(`[VentaException] ${message}`, code);
  }
}

export class VentaNoEncontradaException extends VentaException {
  constructor(id: number) {
    super(`Venta con ID ${id} no encontrada`, 'VENTA_NOT_FOUND');
  }
}

export class VentaInvalidaException extends VentaException {
  constructor(mensaje?: string) {
    super(mensaje || 'Los datos de la venta son inválidos. Verifica ruta, ciudades y monto total', 'VENTA_INVALID');
  }
}

export class VentaNoModificableException extends VentaException {
  constructor(id: number, estado: string) {
    super(`La venta ${id} no puede modificarse en su estado actual: ${estado}`, 'VENTA_NOT_MODIFIABLE');
  }
}
