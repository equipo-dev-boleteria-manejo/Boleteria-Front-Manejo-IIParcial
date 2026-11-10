import { describe, expect, it } from 'vitest';
import { Frecuencia, ParadaIntermedia } from '../../Domain/Entities/Frecuencia';
import {
  OPCIONES_FILTRO_ESTADO,
  aDatosEdicion,
  aFilaFrecuencia,
  aFilaParada,
  filtrarFilas,
  formatearCosto,
  formatearMinutos,
  mensajeLegible,
  resumirDias,
  resumirFrecuencias,
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
      costoProporcional: 3.5,
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

describe('aDatosEdicion y código ANT', () => {
  it('prepara los datos para precargar el formulario de edición', () => {
    const frecuencia = new Frecuencia(2, 'Quito', 'Cuenca', '08:30:00', 'FR-001', false, ['Lunes', 'Viernes']);
    frecuencia.codigoAnt = 'ANT-1';

    const datos = aDatosEdicion(frecuencia);

    expect(datos).toEqual({
      cooperativaId: 2,
      identificadorFrecuencia: 'FR-001',
      ciudadOrigen: 'Quito',
      ciudadDestino: 'Cuenca',
      horaSalida: '08:30',
      esDirecto: false,
      diasOperacion: ['Lunes', 'Viernes'],
      codigoAnt: 'ANT-1',
      resolucionAnt: '',
      totalParadas: 0,
    });
    expect(datos.diasOperacion).not.toBe(frecuencia.diasOperacion);
  });

  it('un código ANT vacío o en blanco se muestra como "—" en la tabla', () => {
    const frecuencia = new Frecuencia(1, 'Quito', 'Cuenca', '08:30', 'FR-001');
    frecuencia.codigoAnt = '   ';

    expect(aFilaFrecuencia(frecuencia).codigoAnt).toBe('—');
    frecuencia.codigoAnt = '';
    expect(aFilaFrecuencia(frecuencia).codigoAnt).toBe('—');
  });
});

describe('mensajeLegible', () => {
  it('quita el prefijo técnico de las excepciones de dominio', () => {
    expect(mensajeLegible('[FrecuenciaException] El identificador FR-001 ya existe para la cooperativa 1')).toBe(
      'El identificador FR-001 ya existe para la cooperativa 1',
    );
    expect(mensajeLegible('Sin conexión con el servidor')).toBe('Sin conexión con el servidor');
    expect(mensajeLegible('[ParadaException]   Orden inválido')).toBe('Orden inválido');
  });
});

describe('resumirFrecuencias', () => {
  it('cuenta total, activas, inactivas y las que tienen paradas', () => {
    const conParadas = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', 'FR-1');
    conParadas.establecerParadas([new ParadaIntermedia('Latacunga', 1, 120)]);
    const inactiva = new Frecuencia(1, 'Quito', 'Ambato', '09:00', 'FR-2');
    inactiva.desactivar();
    const directa = new Frecuencia(1, 'Quito', 'Loja', '10:00', 'FR-3');

    expect(resumirFrecuencias([conParadas, inactiva, directa])).toEqual({
      total: 3,
      activas: 2,
      inactivas: 1,
      conParadas: 1,
    });
  });

  it('devuelve ceros cuando no hay frecuencias', () => {
    expect(resumirFrecuencias([])).toEqual({ total: 0, activas: 0, inactivas: 0, conParadas: 0 });
  });
});

describe('filtrarFilas', () => {
  const fila = (extras: Partial<ReturnType<typeof aFilaFrecuencia>>) => ({
    id: 1,
    identificador: 'FR-001',
    origen: 'Quito',
    destino: 'Cuenca',
    ruta: 'Quito → Cuenca',
    horaSalida: '08:00',
    tipo: 'Directo' as const,
    dias: 'Todos los días',
    totalParadas: 0,
    tiempoUltimaParada: 'Sin estimar',
    codigoAnt: 'ANT-9',
    activa: true,
    faltanParadas: false,
    ...extras,
  });

  const filas = [
    fila({ id: 1 }),
    fila({ id: 2, identificador: 'FR-002', origen: 'Guayaquil', destino: 'Machala', ruta: 'Guayaquil → Machala', codigoAnt: '—', activa: false }),
    fila({ id: 3, identificador: 'FR-003', origen: 'Cuenca', destino: 'Loja', ruta: 'Cuenca → Loja', codigoAnt: '—' }),
  ];

  it('sin texto ni estado devuelve todas', () => {
    expect(filtrarFilas(filas, '', 'Todas')).toHaveLength(3);
  });

  it('busca por origen, destino, identificador y código sin distinguir mayúsculas ni tildes', () => {
    expect(filtrarFilas(filas, 'cuenca', 'Todas').map((f) => f.id)).toEqual([1, 3]);
    expect(filtrarFilas(filas, 'FR-002', 'Todas').map((f) => f.id)).toEqual([2]);
    expect(filtrarFilas(filas, 'ant-9', 'Todas').map((f) => f.id)).toEqual([1]);
    expect(filtrarFilas([fila({ origen: 'Alausí', ruta: 'Alausí → Cuenca' })], 'alausi', 'Todas')).toHaveLength(1);
  });

  it('filtra por estado y combina con el texto', () => {
    expect(filtrarFilas(filas, '', 'Activas').map((f) => f.id)).toEqual([1, 3]);
    expect(filtrarFilas(filas, '', 'Inactivas').map((f) => f.id)).toEqual([2]);
    expect(filtrarFilas(filas, 'cuenca', 'Inactivas')).toEqual([]);
  });

  it('expone las opciones del filtro de estado', () => {
    expect(OPCIONES_FILTRO_ESTADO.map((o) => o.value)).toEqual(['Todas', 'Activas', 'Inactivas']);
  });
});
