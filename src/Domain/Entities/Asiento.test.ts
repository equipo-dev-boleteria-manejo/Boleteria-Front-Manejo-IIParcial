import { describe, expect, it } from 'vitest';
import { Asiento } from './Asiento';

describe('Asiento (Mapa físico del bus)', () => {
  it('valida un asiento con bus, número, tipo y piso correctos', () => {
    const asiento = new Asiento(7, '12', 'VIP', '3', 'B', 1);

    expect(asiento.esValido()).toBe(true);
    expect(asiento.estaDisponible()).toBe(true);
    expect(asiento.busId).toBe(7);
    expect(asiento.numeroAsiento).toBe('12');
  });

  it('rechaza buses o números inválidos y pisos menores a uno', () => {
    expect(new Asiento(0, '1').esValido()).toBe(false);
    expect(new Asiento(1.5, '1').esValido()).toBe(false);
    expect(new Asiento(1, '   ').esValido()).toBe(false);
    expect(new Asiento(1, '1', '   ').esValido()).toBe(false);
    expect(new Asiento(1, '1', 'Normal', '1', 'A', 0).esValido()).toBe(false);
  });

  it('permite marcar y restaurar la disponibilidad del asiento', () => {
    const asiento = new Asiento(1, '1');

    asiento.marcarNoDisponible();
    expect(asiento.estaDisponible()).toBe(false);

    asiento.marcarDisponible();
    expect(asiento.estaDisponible()).toBe(true);
  });
});
