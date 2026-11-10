import { describe, expect, it } from 'vitest';
import { ValidarAsignacionAsiento } from './ValidarAsignacionAsiento';
import { AsignacionAsientoInvalidaException } from '../Exceptions/AsientoException';

describe('ValidarAsignacionAsiento (Servicio de Dominio)', () => {
  it('permite asignación cuando la ruta no es directa aunque el destino no sea la terminal', () => {
    const input = {
      rutaTipoDirecta: false,
      paradaDestinoId: 2,
      terminalDestinoId: 5,
    };
    expect(ValidarAsignacionAsiento.esAsignacionValida(input)).toBe(true);
    expect(() => ValidarAsignacionAsiento.validar(input)).not.toThrow();
  });

  it('permite asignación en ruta directa si el destino es la terminal final', () => {
    const input = {
      rutaTipoDirecta: true,
      paradaDestinoId: 5,
      terminalDestinoId: 5,
    };
    expect(ValidarAsignacionAsiento.esAsignacionValida(input)).toBe(true);
    expect(() => ValidarAsignacionAsiento.validar(input)).not.toThrow();
  });

  it('rechaza asignación en ruta directa si el destino es una parada intermedia y lanza excepción', () => {
    const input = {
      rutaTipoDirecta: true,
      paradaDestinoId: 2,
      terminalDestinoId: 5,
    };
    expect(ValidarAsignacionAsiento.esAsignacionValida(input)).toBe(false);
    expect(() => ValidarAsignacionAsiento.validar(input)).toThrow(
      AsignacionAsientoInvalidaException
    );
  });
});
