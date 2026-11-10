import { describe, expect, it } from 'vitest';
import { fechaLocalISO, sumarDias } from './fechaLocal';

describe('fechaLocalISO', () => {
  it('usa la fecha local, incluso a última hora del día', () => {
    expect(fechaLocalISO(new Date(2026, 10, 9, 23, 30))).toBe('2026-11-09');
    expect(fechaLocalISO(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
  });

  it('sin argumentos devuelve hoy con formato YYYY-MM-DD', () => {
    expect(fechaLocalISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('sumarDias', () => {
  it('suma y resta días', () => {
    expect(sumarDias('2026-11-10', 1)).toBe('2026-11-11');
    expect(sumarDias('2026-11-10', -1)).toBe('2026-11-09');
    expect(sumarDias('2026-11-10', 0)).toBe('2026-11-10');
  });

  it('respeta los cambios de mes y de año, y los años bisiestos', () => {
    expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2026-01-01', -1)).toBe('2025-12-31');
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29');
    expect(sumarDias('2027-02-28', 1)).toBe('2027-03-01');
  });
});
