import { DomainException } from '../../Domain/Exceptions/DomainException';

/** Quita el prefijo técnico de las excepciones de dominio: "[RutaException] Texto" -> "Texto". */
function sinPrefijoTecnico(mensaje: string): string {
  return mensaje.replace(/^\[[A-Za-z]+Exception\]\s*/, '').trim();
}

export function mensajeErrorParaUsuario(error: unknown, fallback: string): string {
  if (error instanceof DomainException) {
    if (error.code === 'RUTA_NOT_MODIFIABLE') {
      return 'La modalidad solo puede cambiarse mientras la ruta está Programada.';
    }

    return sinPrefijoTecnico(error.message) || `Error de dominio (${error.code}).`;
  }

  return fallback;
}
