import { describe, expect, it } from 'vitest';
import { Frecuencia, ParadaIntermedia } from '../../Domain/Entities/Frecuencia';
import {
  aFilaFrecuencia,
  aFilaParada,
  formatearCosto,
  formatearMinutos,
  resumirDias,
  siguienteOrdenParada,
} from './presentacionFrecuencias';

describe('formatearMinutos', () => {
  it.each([
    [0, '0 min'],
    [45, '45 min'],
    [60, '1 h'],
    [90, '1 h 30 min'],
    [240, '4 h'],
    [-5, '0 min'],
  ])('%s minutos -> %s', (minutos, esperado) => {
    expect(formatearMinutos(minutos)).toBe(esperado);
  });
});

describe('resumirDias', () => {
  it('resume los 7 días como "Todos los días"', () => {
    expect(
      resumirDias(['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']),
    ).toBe('Todos los días');
  });

  it('abrevia y ordena los días según la semana, sin importar el orden recibido', () => {
    expect(resumirDias(['Sabado', 'Lunes', 'Miercoles'])).toBe('Lun, Mié, Sáb');
  });

  it('indica cuando no hay días', () => {
    expect(resumirDias([])).toBe('Sin días');
  });
});

describe('formatearCosto', () => {
  it('formatea montos positivos y marca los vacíos', () => {
    expect(formatearCosto(2.5)).toBe('$2.50');
    expect(formatearCosto(0)).toBe('—');
  });
});

describe('modelos de presentación', () => {
  const crearFrecuencia = (): Frecuencia => {
    const frecuencia = new Frecuencia(1, 'Quito', 'Cuenca', '08:30', 'FR-001', false, ['Lunes', 'Viernes']);
    frecuencia.id = 7;
    frecuencia.codigoAnt = 'ANT-9';
    return frecuencia;
  };

  it('convierte una frecuencia sin paradas en una fila con valores por defecto legibles', () => {
    const fila = aFilaFrecuencia(crearFrecuencia());

    expect(fila).toMatchObject({
      id: 7,
      identificador: 'FR-001',
      ruta: 'Quito → Cuenca',
      horaSalida: '08:30',
      tipo: 'Con paradas',
      dias: 'Lun, Vie',
      totalParadas: 0,
      tiempoUltimaParada: 'Sin estimar',
      codigoAnt: 'ANT-9',
      activa: true,
    });
  });

  it('calcula el tiempo hasta la última parada y marca las frecuencias directas', () => {
    const frecuencia = new Frecuencia(1, 'Quito', 'Cuenca', '08:30', 'FR-002');
    frecuencia.establecerParadas([
      new ParadaIntermedia('Riobamba', 2, 240),
      new ParadaIntermedia('Latacunga', 1, 90),
    ]);

    const fila = aFilaFrecuencia(frecuencia);

    expect(fila.tipo).toBe('Directo');
    expect(fila.totalParadas).toBe(2);
    expect(fila.tiempoUltimaParada).toBe('4 h');
    expect(fila.codigoAnt).toBe('—');
  });

  it('convierte una parada en una fila con tiempo y costo formateados', () => {
    const parada = new ParadaIntermedia('Latacunga', 1, 90, false, 3.5);
    parada.id = 12;

    expect(aFilaParada(parada)).toEqual({
      id: 12,
      orden: 1,
      ciudad: 'Latacunga',
      tiempo: '1 h 30 min',
      minutosDesdeOrigen: 90,
      permiteVenta: false,
      costo: '$3.50',
    });
  });

  it('sugiere el orden que sigue a la última parada', () => {
    const frecuencia = crearFrecuencia();
    expect(siguienteOrdenParada(frecuencia)).toBe(1);
    expect(siguienteOrdenParada(null)).toBe(1);

    frecuencia.establecerParadas([new ParadaIntermedia('A', 1, 10), new ParadaIntermedia('B', 4, 20)]);
    expect(siguienteOrdenParada(frecuencia)).toBe(5);
  });
});
