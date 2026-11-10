import { describe, expect, it } from 'vitest';
import { Placa, PROVINCIAS_ECUADOR } from './Placa';
import { BusInvalidoException } from '../Exceptions/BusException';

describe('Placa Value Object', () => {
  it('debe crear una placa válida de 4 dígitos (ej: PBA-1234)', () => {
    const placa = new Placa('PBA-1234');
    expect(placa.valor).toBe('PBA-1234');
    expect(placa.provincia).toBe('Pichincha');
  });

  it('debe crear una placa válida de 3 dígitos (ej: PBA-254)', () => {
    const placa = new Placa('pba-254');
    expect(placa.valor).toBe('PBA-254');
    expect(placa.provincia).toBe('Pichincha');
  });

  it('debe limpiar caracteres extraños al inicio como guiones (-PBA-254)', () => {
    const placa = new Placa('-PBA-254');
    expect(placa.valor).toBe('PBA-254');
  });

  it('debe formatear e insertar el guion si se envía sin guion (ej: PBA1234)', () => {
    const placa = new Placa('tba1234');
    expect(placa.valor).toBe('TBA-1234');
    expect(placa.provincia).toBe('Tungurahua');
  });

  it('debe rechazar placas con letras de provincia no existentes en Ecuador (ej: D, F)', () => {
    expect(Placa.validar('DBA-1234')).toBe(false);
    expect(Placa.validar('FBA-1234')).toBe(false);
    expect(() => new Placa('DBA-1234')).toThrow(BusInvalidoException);
  });

  it('debe rechazar placas con menos de 3 dígitos o más de 4 dígitos', () => {
    expect(Placa.validar('PBA-12')).toBe(false);
    expect(Placa.validar('PBA-12345')).toBe(false);
  });

  it('debe rechazar cadenas vacías o no válidas', () => {
    expect(Placa.validar('')).toBe(false);
    expect(Placa.validar('---')).toBe(false);
    expect(Placa.validar('1234-PBA')).toBe(false);
  });

  it('debe mapear correctamente provincias como Guayas (G) y Azuay (A)', () => {
    expect(Placa.obtenerProvincia('GBA-5555')).toBe('Guayas');
    expect(Placa.obtenerProvincia('ABA-0101')).toBe('Azuay');
  });
});
