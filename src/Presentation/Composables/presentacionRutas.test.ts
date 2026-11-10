import { describe, expect, it } from 'vitest';
import { EstadoHojaRuta, EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import { Bus } from '../../Domain/Entities/Bus';
import { HojaRuta } from '../../Domain/Entities/HojaRuta';
import { Frecuencia, ParadaIntermedia } from '../../Domain/Entities/Frecuencia';
import { Ruta } from '../../Domain/Entities/Ruta';
import {
  OPCIONES_FILTRO_ESTADO_RUTA,
  aFilaTrayecto,
  claseBadgeEstadoHoja,
  choferesDisponibles,
  claseBadgeEstadoRuta,
  etiquetaBus,
  etiquetaChofer,
  etiquetaEstadoRuta,
  etiquetaModalidad,
  fechaAdmiteTrayectos,
  fechaLocalISO,
  motivoInicioBloqueado,
  ordenarPorHora,
  resumirHojas,
  rutaTieneIncidente,
  textoSelectorChofer,
} from './presentacionRutas';

const crearRuta = (extras: Partial<Ruta> = {}, estado: string = EstadoRuta.PROGRAMADA): Ruta => {
  const ruta = new Ruta(1, 5, '2026-11-10', estado as never);
  ruta.id = 10;
  ruta.horaSalida = '08:30';
  return Object.assign(ruta, extras);
};

const crearBus = (id: number, numero = '12', placa = 'PBA-1234'): Bus => {
  const bus = new Bus(1, numero, placa, 40);
  bus.id = id;
  return bus;
};

describe('estados de ruta y de hoja', () => {
  it('muestra etiquetas legibles y no el valor de dominio', () => {
    expect(etiquetaEstadoRuta(EstadoRuta.EN_CURSO)).toBe('En curso');
    expect(etiquetaEstadoRuta(EstadoRuta.PROGRAMADA)).toBe('Programada');
    expect(etiquetaEstadoRuta('Otro')).toBe('Otro');
    expect(etiquetaEstadoRuta(undefined)).toBe('—');
  });

  it('asigna un color distinto a cada estado de ruta y uno neutro por defecto', () => {
    const clases = [
      EstadoRuta.PROGRAMADA,
      EstadoRuta.EN_CURSO,
      EstadoRuta.FINALIZADA,
      EstadoRuta.CANCELADA,
    ].map(claseBadgeEstadoRuta);

    expect(new Set(clases).size).toBe(4);
    expect(claseBadgeEstadoRuta(EstadoRuta.EN_CURSO)).toContain('animate-pulse');
    expect(claseBadgeEstadoRuta('x')).toContain('bg-slate-100');
  });

  it('asigna un color a cada estado de hoja de ruta', () => {
    expect(claseBadgeEstadoHoja(EstadoHojaRuta.BORRADOR)).toContain('bg-blue-50');
    expect(claseBadgeEstadoHoja(EstadoHojaRuta.EMITIDA)).toContain('bg-amber-50');
    expect(claseBadgeEstadoHoja(EstadoHojaRuta.CERRADA)).toContain('bg-emerald-50');
    expect(claseBadgeEstadoHoja('x')).toContain('bg-slate-100');
  });

  it('el filtro de estado cubre "Todas" y los cuatro estados de ruta', () => {
    expect(OPCIONES_FILTRO_ESTADO_RUTA.map((opcion) => opcion.value)).toEqual([
      'Todas',
      EstadoRuta.PROGRAMADA,
      EstadoRuta.EN_CURSO,
      EstadoRuta.FINALIZADA,
      EstadoRuta.CANCELADA,
    ]);
  });
});

describe('etiquetas de modalidad, bus, chofer e incidente', () => {
  it('nombra la modalidad', () => {
    expect(etiquetaModalidad(true)).toBe('Directo');
    expect(etiquetaModalidad(false)).toBe('Con paradas');
  });

  it('detecta incidentes sin distinguir mayúsculas', () => {
    expect(rutaTieneIncidente({ observacionChofer: 'INCIDENTE: falla mecánica' })).toBe(true);
    expect(rutaTieneIncidente({ observacionChofer: 'Incidente en km 4' })).toBe(true);
    expect(rutaTieneIncidente({ observacionChofer: 'Sin novedades' })).toBe(false);
    expect(rutaTieneIncidente({})).toBe(false);
  });

  it('etiqueta el bus por número y placa, o por su id si no está cargado', () => {
    expect(etiquetaBus(5, [crearBus(5, '12', 'PBA-1234')])).toBe('Bus #12 (PBA-1234)');
    expect(etiquetaBus(9, [crearBus(5)])).toBe('Unidad #9');
  });

  it('muestra el nombre del chofer y no su UUID', () => {
    const choferes = [{ id: 'uuid-1', nombreCompleto: 'Ana Pérez' }];

    expect(etiquetaChofer('uuid-1', choferes)).toBe('Ana Pérez');
    expect(etiquetaChofer('uuid-2', choferes)).toBe('Chofer asignado (no activo)');
    expect(etiquetaChofer(undefined, choferes)).toBe('Sin chofer asignado');
  });
});

describe('ordenarPorHora', () => {
  it('ordena por hora de salida dejando al final las rutas sin hora, sin mutar el original', () => {
    const original = [
      { id: 1, horaSalida: '14:00' },
      { id: 2 },
      { id: 3, horaSalida: '06:15' },
    ];

    expect(ordenarPorHora(original).map((item) => item.id)).toEqual([3, 1, 2]);
    expect(original.map((item) => item.id)).toEqual([1, 2, 3]);
  });
});

describe('aFilaTrayecto', () => {
  it('una ruta programada admite iniciar, cancelar y cambiar la modalidad', () => {
    const fila = aFilaTrayecto(crearRuta({ esDirecta: false }), [crearBus(5)]);

    expect(fila).toMatchObject({
      clave: '10',
      hora: '08:30',
      llegada: null,
      bus: 'Bus #12 (PBA-1234)',
      modalidad: 'Con paradas',
      esDirecta: false,
      estado: 'Programada',
      puedeCambiarModalidad: true,
      puedeIniciar: true,
      puedeFinalizar: false,
      puedeCancelar: true,
    });
  });

  it('una ruta en curso solo permite finalizar y no cambiar la modalidad', () => {
    const fila = aFilaTrayecto(crearRuta({ horaLlegada: '12:00' }, EstadoRuta.EN_CURSO), []);

    expect(fila).toMatchObject({
      llegada: '12:00',
      estado: 'En curso',
      puedeCambiarModalidad: false,
      puedeIniciar: false,
      puedeFinalizar: true,
      puedeCancelar: false,
    });
  });

  it('usa una clave estable y una hora de relleno cuando la ruta aún no tiene id ni hora', () => {
    const fila = aFilaTrayecto(crearRuta({ id: undefined, horaSalida: undefined }), []);

    expect(fila.clave).toBe('5-1-');
    expect(fila.hora).toBe('--:--');
    expect(fila.bus).toBe('Unidad #5');
  });
});

describe('resumirHojas', () => {
  it('cuenta hojas y trayectos por estado', () => {
    const hojaA = new HojaRuta('2026-11-10');
    hojaA.rutas = [
      crearRuta({ id: 1 }),
      crearRuta({ id: 2 }, EstadoRuta.EN_CURSO),
      crearRuta({ id: 3 }, EstadoRuta.FINALIZADA),
    ];
    const hojaB = new HojaRuta('2026-11-10');
    hojaB.rutas = [crearRuta({ id: 4 }), crearRuta({ id: 5 }, EstadoRuta.CANCELADA)];

    expect(resumirHojas([hojaA, hojaB])).toEqual({
      hojas: 2,
      trayectos: 5,
      programados: 2,
      enCurso: 1,
      finalizados: 1,
    });
  });

  it('devuelve ceros sin hojas o con hojas sin trayectos', () => {
    expect(resumirHojas([])).toEqual({ hojas: 0, trayectos: 0, programados: 0, enCurso: 0, finalizados: 0 });
    expect(resumirHojas([new HojaRuta('2026-11-10')]).trayectos).toBe(0);
  });
});

describe('fechaLocalISO', () => {
  it('usa la fecha local y no la UTC, incluso a última hora del día', () => {
    // 23:30 hora local: en UTC-5 ya sería el día siguiente en UTC.
    expect(fechaLocalISO(new Date(2026, 10, 9, 23, 30))).toBe('2026-11-09');
    expect(fechaLocalISO(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
  });

  it('sin argumentos devuelve el día de hoy con formato YYYY-MM-DD', () => {
    expect(fechaLocalISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('selector de chofer de una ruta', () => {
  const choferes = [
    { id: 'a', nombreCompleto: 'Ana' },
    { id: 'b', nombreCompleto: 'Beto' },
  ];

  it('excluye al chofer que ya está asignado: reasignarlo no cambiaría nada', () => {
    expect(choferesDisponibles('a', choferes).map((c) => c.id)).toEqual(['b']);
    expect(choferesDisponibles(undefined, choferes)).toHaveLength(2);
    expect(choferesDisponibles('a', [choferes[0]!])).toEqual([]);
  });

  it('el marcador indica si se asigna o se cambia', () => {
    expect(textoSelectorChofer(undefined)).toBe('Asignar chofer…');
    expect(textoSelectorChofer('a')).toBe('Cambiar chofer…');
  });

describe('viajes de fechas futuras', () => {
  it('solo bloquea el inicio cuando la fecha de la ruta es posterior a hoy', () => {
    expect(motivoInicioBloqueado('2026-11-12', '2026-11-10')).toBe('Solo se puede iniciar el día del viaje (2026-11-12).');
    expect(motivoInicioBloqueado('2026-11-10', '2026-11-10')).toBe('');
    expect(motivoInicioBloqueado('2026-11-01', '2026-11-10')).toBe('');
  });

  it('una fila programada para otro día no se puede iniciar, pero sí cancelar', () => {
    const futura = crearRuta({ fecha: '2026-11-12' });

    const fila = aFilaTrayecto(futura, [], '2026-11-10');

    expect(fila.puedeIniciar).toBe(true);
    expect(fila.iniciarBloqueadoPor).toBe('Solo se puede iniciar el día del viaje (2026-11-12).');
    expect(fila.puedeCancelar).toBe(true);
  });

  it('una fila del día, o una que no está programada, no tiene bloqueo de inicio', () => {
    expect(aFilaTrayecto(crearRuta({ fecha: '2026-11-10' }), [], '2026-11-10').iniciarBloqueadoPor).toBe('');
    expect(aFilaTrayecto(crearRuta({ fecha: '2026-11-12' }, EstadoRuta.EN_CURSO), [], '2026-11-10').iniciarBloqueadoPor).toBe('');
  });
});

describe('cambio de modalidad según la frecuencia', () => {
  const crearFrecuencia = (id: number, esDirecto: boolean, paradas: number) => {
    const frecuencia = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', `FR-${id}`, esDirecto);
    frecuencia.id = id;
    frecuencia.establecerParadas(
      Array.from({ length: paradas }, (_, i) => new ParadaIntermedia(`Ciudad${i}`, i + 1, 60 * (i + 1))),
    );
    return frecuencia;
  };

  it('un trayecto directo de una frecuencia directa no puede pasar a "con paradas"', () => {
    const ruta = crearRuta({ frecuenciaId: 1, esDirecta: true });

    const fila = aFilaTrayecto(ruta, [], '2026-11-10', [crearFrecuencia(1, true, 0)]);

    expect(fila.puedeCambiarModalidad).toBe(false);
  });

  it('un trayecto directo de una frecuencia con paradas sí puede pasar a "con paradas"', () => {
    const ruta = crearRuta({ frecuenciaId: 1, esDirecta: true });

    expect(aFilaTrayecto(ruta, [], '2026-11-10', [crearFrecuencia(1, false, 2)]).puedeCambiarModalidad).toBe(true);
  });

  it('un trayecto con paradas siempre puede pasar a directo', () => {
    const ruta = crearRuta({ frecuenciaId: 1, esDirecta: false });

    expect(aFilaTrayecto(ruta, [], '2026-11-10', [crearFrecuencia(1, false, 2)]).puedeCambiarModalidad).toBe(true);
  });

  it('si la frecuencia no está cargada no se bloquea el cambio', () => {
    const ruta = crearRuta({ frecuenciaId: 1, esDirecta: true });

    expect(aFilaTrayecto(ruta, [], '2026-11-10', []).puedeCambiarModalidad).toBe(true);
    expect(aFilaTrayecto(ruta, [], '2026-11-10', [crearFrecuencia(9, true, 0)]).puedeCambiarModalidad).toBe(true);
  });

  it('un trayecto que no está programado nunca puede cambiar de modalidad', () => {
    const ruta = crearRuta({ frecuenciaId: 1, esDirecta: false }, EstadoRuta.EN_CURSO);

    expect(aFilaTrayecto(ruta, [], '2026-11-10', [crearFrecuencia(1, false, 2)]).puedeCambiarModalidad).toBe(false);
  });
});

describe('fechaAdmiteTrayectos', () => {
  it('sin hoja o con una hoja abierta se pueden vincular trayectos', () => {
    expect(fechaAdmiteTrayectos([])).toBe(true);
    expect(fechaAdmiteTrayectos([new HojaRuta('2026-11-10', EstadoHojaRuta.BORRADOR)])).toBe(true);
    expect(fechaAdmiteTrayectos([new HojaRuta('2026-11-10', EstadoHojaRuta.EMITIDA)])).toBe(true);
  });

  it('con la hoja cerrada (o cancelada, que queda cerrada) ya no se admiten trayectos', () => {
    expect(fechaAdmiteTrayectos([new HojaRuta('2026-11-10', EstadoHojaRuta.CERRADA)])).toBe(false);
  });
});
});
