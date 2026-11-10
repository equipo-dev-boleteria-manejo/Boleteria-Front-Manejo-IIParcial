import { describe, expect, it } from 'vitest';
import {
  MAX_CODIGO_BOLETO,
  MAX_OBSERVACION,
  MAX_TIEMPO_VIAJE_MINUTOS,
  validarCodigoBoleto,
  validarDiaOperativo,
  validarFechaConsulta,
  validarFechaRuta,
  validarObservacionObligatoria,
  validarObservacionOpcional,
  validarSeleccion,
  validarTiempoViaje,
} from './validacionRutas';

describe('validarSeleccion', () => {
  it('rechaza un select sin elegir y acepta un id válido', () => {
    expect(validarSeleccion('', 'Selecciona una frecuencia')).toBe('Selecciona una frecuencia');
    expect(validarSeleccion(0, 'Selecciona una unidad')).toBe('Selecciona una unidad');
    expect(validarSeleccion(3, 'Selecciona una unidad')).toBe('');
    expect(validarSeleccion('7', 'Selecciona una unidad')).toBe('');
  });
});

describe('validarFechaRuta', () => {
  const hoy = '2026-11-10';

  it('exige la fecha, su validez y que no sea anterior a hoy', () => {
    expect(validarFechaRuta('', hoy)).toBe('La fecha del viaje es obligatoria');
    expect(validarFechaRuta('10/11/2026', hoy)).toBe('La fecha no es válida');
    expect(validarFechaRuta('2026-02-31', hoy)).toBe('La fecha no es válida');
    expect(validarFechaRuta('2026-11-09', hoy)).toBe('La fecha no puede ser anterior a hoy');
  });

  it('acepta hoy y fechas futuras', () => {
    expect(validarFechaRuta('2026-11-10', hoy)).toBe('');
    expect(validarFechaRuta('2027-01-01', hoy)).toBe('');
  });
});

describe('validarFechaConsulta', () => {
  it('exige una fecha válida pero permite consultar días pasados', () => {
    expect(validarFechaConsulta('')).toBe('La fecha de operación es obligatoria');
    expect(validarFechaConsulta('2026-13-01')).toBe('La fecha no es válida');
    expect(validarFechaConsulta('2020-01-01')).toBe('');
  });
});

describe('validarDiaOperativo', () => {
  it('avisa cuando la frecuencia no opera el día elegido', () => {
    expect(validarDiaOperativo(true)).toBe('');
    expect(validarDiaOperativo(false)).toBe('La frecuencia seleccionada no opera en la fecha elegida');
  });
});

describe('validarTiempoViaje', () => {
  it('es opcional y, si se indica, debe ser un entero entre 1 minuto y 24 horas', () => {
    expect(validarTiempoViaje('')).toBe('');
    expect(validarTiempoViaje('240')).toBe('');
    expect(validarTiempoViaje(String(MAX_TIEMPO_VIAJE_MINUTOS))).toBe('');
    for (const valor of ['0', '-5', '1.5', 'abc', String(MAX_TIEMPO_VIAJE_MINUTOS + 1)]) {
      expect(validarTiempoViaje(valor)).toContain('entero de minutos');
    }
  });
});

describe('observaciones', () => {
  it('la opcional solo limita el largo', () => {
    expect(validarObservacionOpcional('')).toBe('');
    expect(validarObservacionOpcional('x'.repeat(MAX_OBSERVACION))).toBe('');
    expect(validarObservacionOpcional('x'.repeat(MAX_OBSERVACION + 1))).toContain(`${MAX_OBSERVACION}`);
  });

  it('la obligatoria exige contenido con algo de detalle y largo máximo', () => {
    expect(validarObservacionObligatoria('')).toBe('La observación es obligatoria');
    expect(validarObservacionObligatoria('   ')).toBe('La observación es obligatoria');
    expect(validarObservacionObligatoria('ok')).toContain('al menos 5 caracteres');
    expect(validarObservacionObligatoria('Falla mecánica en km 45')).toBe('');
    expect(validarObservacionObligatoria('x'.repeat(MAX_OBSERVACION + 1))).toContain(`${MAX_OBSERVACION}`);
  });
});

describe('validarCodigoBoleto', () => {
  it('exige un código sin espacios y de largo razonable', () => {
    expect(validarCodigoBoleto('')).toBe('El código del boleto es obligatorio');
    expect(validarCodigoBoleto('BOL 2026')).toBe('El código no puede contener espacios');
    expect(validarCodigoBoleto('BOL-2026-000123')).toBe('');
    expect(validarCodigoBoleto('A'.repeat(MAX_CODIGO_BOLETO + 1))).toContain(`${MAX_CODIGO_BOLETO}`);
  });
});
