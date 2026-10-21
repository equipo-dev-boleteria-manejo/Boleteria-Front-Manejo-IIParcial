/**
 * UsuarioException.ts - Excepciones de dominio para el módulo de Usuarios y Autenticación
 */

import { DomainException } from './DomainException';

export class UsuarioException extends DomainException {
  constructor(message: string, code: string = 'USUARIO_ERROR') {
    super(`[UsuarioException] ${message}`, code);
  }
}

export class UsuarioNoEncontradoException extends UsuarioException {
  constructor(criterio: string) {
    super(`Usuario no encontrado (${criterio})`, 'USUARIO_NOT_FOUND');
  }
}

export class UsuarioInvalidoException extends UsuarioException {
  constructor(mensaje?: string) {
    super(mensaje || 'Los datos del usuario son inválidos. Verifica email, cédula y nombres', 'USUARIO_INVALID');
  }
}

export class UsuarioDesactivadoException extends UsuarioException {
  constructor(emailOId: string) {
    super(`El usuario '${emailOId}' se encuentra inactivo y no puede realizar operaciones`, 'USUARIO_INACTIVE');
  }
}

export class CredencialesInvalidasException extends UsuarioException {
  constructor() {
    super('Credenciales de autenticación incorrectas o inválidas', 'AUTH_INVALID_CREDENTIALS');
  }
}
