import { describe, expect, it } from 'vitest';
import { Cedula } from './Cedula';
import { InvalidCedulaException } from '../Exceptions/InvalidCedulaException';

describe('Cedula (Value Object de Cédula Ecuatoriana)', () => {
  it('instancia una cédula válida con algoritmo Módulo 10 correcto', () => {
    // 1710034065 es una cédula válida de Pichincha
    const cedula = new Cedula('1710034065');
    expect(cedula.valor).toBe('1710034065');
    expect(cedula.toString()).toBe('1710034065');

    // 0926687856 es una cédula válida de Guayas
    const cedulaGuayas = Cedula.crear('0926687856');
    expect(cedulaGuayas.valor).toBe('0926687856');
  });

  it('rechaza cédulas con longitud diferente de 10 dígitos', () => {
    expect(() => new Cedula('12345')).toThrow(InvalidCedulaException);
    expect(() => new Cedula('1710034065111')).toThrow(InvalidCedulaException);
  });

  it('rechaza cédulas con caracteres no numéricos o vacías', () => {
    expect(() => new Cedula('171003406A')).toThrow(InvalidCedulaException);
    expect(() => new Cedula('')).toThrow(InvalidCedulaException);
    expect(() => new Cedula('          ')).toThrow(InvalidCedulaException);
  });

  it('rechaza códigos de provincia inválidos (menores a 1 o mayores a 24 y no 30)', () => {
    // Provincia 00
    expect(() => new Cedula('0010034065')).toThrow(InvalidCedulaException);
    // Provincia 99
    expect(() => new Cedula('9910034065')).toThrow(InvalidCedulaException);
  });

  it('rechaza cédulas con tercer dígito >= 6 para personas naturales', () => {
    // Tercer dígito 7
    expect(() => new Cedula('1770034065')).toThrow(InvalidCedulaException);
  });

  it('rechaza cédulas donde el dígito verificador no coincide', () => {
    // 1710034065 es la válida; si alteramos el último dígito a 4 debe fallar
    expect(() => new Cedula('1710034064')).toThrow(InvalidCedulaException);
  });

  it('compara igualdad por valor (inmutabilidad de Value Object)', () => {
    const c1 = new Cedula('1710034065');
    const c2 = new Cedula('1710034065');
    const c3 = new Cedula('0926687856');

    expect(c1.equals(c2)).toBe(true);
    expect(c1.equals(c3)).toBe(false);
  });
});
