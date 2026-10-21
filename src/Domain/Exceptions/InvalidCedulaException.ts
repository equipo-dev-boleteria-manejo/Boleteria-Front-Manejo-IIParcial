/**
 * InvalidCedulaException.ts - Excepción de dominio para cédula de identidad inválida
 */

import { DomainException } from './DomainException';

export class InvalidCedulaException extends DomainException {
  constructor(cedula: string, motivo?: string) {
    const detalle = motivo ? `: ${motivo}` : '';
    super(
      `[InvalidCedulaException] La cédula '${cedula}' no es válida según el estándar ecuatoriano${detalle}`,
      'INVALID_CEDULA',
    );
  }
}
