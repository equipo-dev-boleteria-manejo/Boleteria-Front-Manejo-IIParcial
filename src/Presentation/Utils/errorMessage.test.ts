import { describe, expect, it } from 'vitest';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { mensajeErrorParaUsuario } from './errorMessage';

describe('mensajeErrorParaUsuario', () => {
  it('traduce el error de ruta no modificable a un mensaje para el usuario', () => {
    const error = new DomainException('La ruta 5 no puede modificarse', 'RUTA_NOT_MODIFIABLE');

    expect(mensajeErrorParaUsuario(error, 'fallback')).toBe(
      'La modalidad solo puede cambiarse mientras la ruta está Programada.',
    );
  });

  it('para otros errores de dominio muestra su mensaje', () => {
    const error = new DomainException('La unidad ya tiene un viaje en ese horario.', 'BUS_NO_DISPONIBLE');

    expect(mensajeErrorParaUsuario(error, 'fallback')).toBe('La unidad ya tiene un viaje en ese horario.');
  });

  it('si el error de dominio no trae mensaje, indica su código', () => {
    const error = new DomainException('', 'CODIGO_X');

    expect(mensajeErrorParaUsuario(error, 'fallback')).toBe('Error de dominio (CODIGO_X).');
  });

  it('un error cualquiera no expone detalles técnicos: usa el mensaje de respaldo', () => {
    expect(mensajeErrorParaUsuario(new Error('ECONNRESET 10.0.0.5:5432'), 'No se pudo completar la operación.')).toBe(
      'No se pudo completar la operación.',
    );
    expect(mensajeErrorParaUsuario('texto', 'respaldo')).toBe('respaldo');
    expect(mensajeErrorParaUsuario(null, 'respaldo')).toBe('respaldo');
  });

  it('quita el prefijo técnico "[XxxException]" que anteponen las excepciones de dominio', () => {
    const error = new DomainException('[RutaException] La ruta debe encontrarse En Curso.', 'RUTA_ESTADO_INVALIDO');

    expect(mensajeErrorParaUsuario(error, 'fallback')).toBe('La ruta debe encontrarse En Curso.');
  });

  it('si tras quitar el prefijo no queda texto, indica el código del error', () => {
    expect(mensajeErrorParaUsuario(new DomainException('[RutaException]', 'RUTA_ERROR'), 'fallback')).toBe(
      'Error de dominio (RUTA_ERROR).',
    );
  });
});
