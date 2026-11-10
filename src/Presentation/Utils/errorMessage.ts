import { DomainException } from '../../Domain/Exceptions/DomainException';

export function mensajeErrorParaUsuario(error: unknown, fallback: string): string {
  if (error instanceof DomainException) {
    if (error.code === 'RUTA_NOT_MODIFIABLE') {
      return 'La modalidad solo puede cambiarse mientras la ruta está Programada.';
    }

    return error.message || `Error de dominio (${error.code}).`;
  }

  return fallback;
}
