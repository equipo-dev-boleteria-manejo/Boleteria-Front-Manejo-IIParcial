import { describe, expect, it } from 'vitest';
import { Frecuencia, ParadaIntermedia } from '../Entities/Frecuencia';
import { frecuenciaAdmiteParadas } from './modalidadRuta';

const crear = (esDirecto: boolean, paradas: number) => {
  const frecuencia = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', 'FR-1', esDirecto);
  frecuencia.establecerParadas(
    Array.from({ length: paradas }, (_, i) => new ParadaIntermedia(`Ciudad${i}`, i + 1, 60 * (i + 1))),
  );
  return frecuencia;
};

describe('frecuenciaAdmiteParadas', () => {
  it('una frecuencia con paradas las admite', () => {
    expect(frecuenciaAdmiteParadas(crear(false, 2))).toBe(true);
  });

  it('una frecuencia directa no las admite, aunque tenga datos de paradas heredados', () => {
    expect(frecuenciaAdmiteParadas(crear(true, 0))).toBe(false);
    expect(frecuenciaAdmiteParadas(crear(true, 2))).toBe(false);
  });

  it('una frecuencia con paradas pero sin ninguna registrada tampoco las admite', () => {
    expect(frecuenciaAdmiteParadas(crear(false, 0))).toBe(false);
  });
});
