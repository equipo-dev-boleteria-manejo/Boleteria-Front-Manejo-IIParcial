import { describe, expect, it } from 'vitest';
import { Ruta } from '../Entities/Ruta';
import { EstadoRuta } from '../Constants/EstadosSistema';
import {
  DURACION_POR_DEFECTO_MINUTOS,
  buscarConflictoHorario,
  crearIntervalo,
  describirHorario,
  horaAMinutos,
  intervaloDeRuta,
  intervalosSeSolapan,
  minutosAHora,
} from './solapamientoRutas';

describe('horaAMinutos / minutosAHora', () => {
  it('convierte horas con y sin segundos', () => {
    expect(horaAMinutos('08:30')).toBe(510);
    expect(horaAMinutos('08:30:00')).toBe(510);
    expect(horaAMinutos('00:00')).toBe(0);
    expect(horaAMinutos('')).toBe(0);
  });

  it('formatea los minutos como hora, incluso pasada la medianoche', () => {
    expect(minutosAHora(510)).toBe('08:30');
    expect(minutosAHora(1800)).toBe('06:00');
    expect(minutosAHora(0)).toBe('00:00');
  });
});

describe('crearIntervalo', () => {
  it('usa la hora de llegada cuando se conoce', () => {
    expect(crearIntervalo('06:00', '09:30')).toEqual({ inicio: 360, fin: 570 });
  });

  it('sin llegada usa el tiempo de viaje, y sin éste la duración por defecto', () => {
    expect(crearIntervalo('06:00', undefined, 90)).toEqual({ inicio: 360, fin: 450 });
    expect(crearIntervalo('06:00')).toEqual({ inicio: 360, fin: 360 + DURACION_POR_DEFECTO_MINUTOS });
    expect(crearIntervalo('06:00', null, 0)).toEqual({ inicio: 360, fin: 360 + DURACION_POR_DEFECTO_MINUTOS });
  });

  it('una llegada anterior a la salida es un viaje nocturno que llega al día siguiente', () => {
    expect(crearIntervalo('22:00', '06:00')).toEqual({ inicio: 1320, fin: 1800 });
  });
});

describe('intervaloDeRuta', () => {
  it('devuelve null cuando la ruta no tiene hora de salida', () => {
    expect(intervaloDeRuta({})).toBeNull();
  });

  it('calcula el intervalo con la llegada, el tiempo de viaje o la duración por defecto', () => {
    expect(intervaloDeRuta({ horaSalida: '07:00:00', horaLlegada: '10:00:00' })).toEqual({ inicio: 420, fin: 600 });
    expect(intervaloDeRuta({ horaSalida: '07:00', tiempoViajeMinutos: 60 })).toEqual({ inicio: 420, fin: 480 });
    expect(intervaloDeRuta({ horaSalida: '07:00' })).toEqual({ inicio: 420, fin: 600 });
  });
});

describe('intervalosSeSolapan', () => {
  const base = { inicio: 360, fin: 540 }; // 06:00 - 09:00

  it('detecta cuando el nuevo viaje empieza dentro, termina dentro o cubre al existente', () => {
    expect(intervalosSeSolapan({ inicio: 420, fin: 600 }, base)).toBe(true);
    expect(intervalosSeSolapan({ inicio: 300, fin: 400 }, base)).toBe(true);
    expect(intervalosSeSolapan({ inicio: 300, fin: 600 }, base)).toBe(true);
    expect(intervalosSeSolapan({ inicio: 400, fin: 500 }, base)).toBe(true);
  });

  it('dos viajes consecutivos, uno justo tras el otro, no se solapan', () => {
    expect(intervalosSeSolapan({ inicio: 540, fin: 700 }, base)).toBe(false);
    expect(intervalosSeSolapan({ inicio: 200, fin: 360 }, base)).toBe(false);
  });

  it('viajes separados no se solapan', () => {
    expect(intervalosSeSolapan({ inicio: 840, fin: 1020 }, base)).toBe(false);
  });

  it('es simétrica', () => {
    const otro = { inicio: 420, fin: 600 };
    expect(intervalosSeSolapan(otro, base)).toBe(intervalosSeSolapan(base, otro));
  });

  it('un viaje nocturno ocupa hasta la madrugada: otro que sale a las 23:00 se solapa', () => {
    const nocturno = crearIntervalo('22:00', '06:00');
    expect(intervalosSeSolapan(crearIntervalo('23:00'), nocturno)).toBe(true);
  });
});

describe('buscarConflictoHorario', () => {
  const crearRuta = (
    id: number,
    fecha: string,
    salida: string | undefined,
    llegada: string | undefined,
    estado: EstadoRuta = EstadoRuta.PROGRAMADA,
  ) => {
    const ruta = new Ruta(1, 10, fecha, estado);
    ruta.id = id;
    ruta.horaSalida = salida;
    ruta.horaLlegada = llegada;
    return ruta;
  };

  const hoy = (...rutas: Ruta[]) => [
    { desfaseDias: -1 as const, rutas: [] },
    { desfaseDias: 0 as const, rutas },
    { desfaseDias: 1 as const, rutas: [] },
  ];
  const nuevo = crearIntervalo('14:00', '17:00');

  it('encuentra una ruta del mismo día que se solapa, con su horario', () => {
    const existente = crearRuta(1, '2026-11-10', '13:00', '16:00');

    const conflicto = buscarConflictoHorario(nuevo, hoy(existente));

    expect(conflicto?.ruta).toBe(existente);
    expect(conflicto && describirHorario(conflicto, '2026-11-10')).toBe('13:00–16:00');
  });

  it('no encuentra conflicto con rutas separadas o consecutivas', () => {
    expect(buscarConflictoHorario(nuevo, hoy(crearRuta(1, '2026-11-10', '06:00', '09:00')))).toBeNull();
    expect(buscarConflictoHorario(nuevo, hoy(crearRuta(1, '2026-11-10', '11:00', '14:00')))).toBeNull();
    expect(buscarConflictoHorario(nuevo, hoy())).toBeNull();
  });

  it('ignora las rutas canceladas y la ruta que se está modificando', () => {
    const cancelada = crearRuta(1, '2026-11-10', '14:00', '17:00', EstadoRuta.CANCELADA);
    const propia = crearRuta(2, '2026-11-10', '14:00', '17:00');

    expect(buscarConflictoHorario(nuevo, hoy(cancelada))).toBeNull();
    expect(buscarConflictoHorario(nuevo, hoy(propia), { ignorarRutaId: 2 })).toBeNull();
    expect(buscarConflictoHorario(nuevo, hoy(propia))).not.toBeNull();
  });

  it('un viaje nocturno de ayer que llega de madrugada ocupa las primeras horas de hoy', () => {
    const ayer = crearRuta(1, '2026-11-09', '22:00', '06:00');
    const dias = [
      { desfaseDias: -1 as const, rutas: [ayer] },
      { desfaseDias: 0 as const, rutas: [] },
      { desfaseDias: 1 as const, rutas: [] },
    ];

    const conflicto = buscarConflictoHorario(crearIntervalo('05:00', '08:00'), dias);

    expect(conflicto?.ruta).toBe(ayer);
    expect(conflicto && describirHorario(conflicto, '2026-11-10')).toBe('2026-11-09 22:00–06:00');
    expect(buscarConflictoHorario(crearIntervalo('06:00', '09:00'), dias)).toBeNull();
  });

  it('un viaje nocturno de hoy choca con uno que sale mañana de madrugada', () => {
    const manana = crearRuta(1, '2026-11-11', '03:00', '06:00');
    const dias = [
      { desfaseDias: -1 as const, rutas: [] },
      { desfaseDias: 0 as const, rutas: [] },
      { desfaseDias: 1 as const, rutas: [manana] },
    ];

    expect(buscarConflictoHorario(crearIntervalo('22:00', '04:00'), dias)?.ruta).toBe(manana);
    expect(buscarConflictoHorario(crearIntervalo('22:00', '02:00'), dias)).toBeNull();
  });

  it('una ruta del mismo día sin hora solo cuenta como ocupada si se pide', () => {
    const sinHora = crearRuta(1, '2026-11-10', undefined, undefined);

    expect(buscarConflictoHorario(nuevo, hoy(sinHora))).toBeNull();
    const conflicto = buscarConflictoHorario(nuevo, hoy(sinHora), { sinHoraOcupa: true });
    expect(conflicto?.ruta).toBe(sinHora);
    expect(conflicto && describirHorario(conflicto, '2026-11-10')).toBe('');
  });

  it('una ruta de otro día sin hora nunca bloquea', () => {
    const sinHora = crearRuta(1, '2026-11-09', undefined, undefined);
    const dias = [
      { desfaseDias: -1 as const, rutas: [sinHora] },
      { desfaseDias: 0 as const, rutas: [] },
      { desfaseDias: 1 as const, rutas: [] },
    ];

    expect(buscarConflictoHorario(nuevo, dias, { sinHoraOcupa: true })).toBeNull();
  });
});
