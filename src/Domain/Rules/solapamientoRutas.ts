/**
 * solapamientoRutas.ts - Regla de dominio: un bus no puede tener dos viajes que se pisen en el tiempo
 *
 * La comparten "Programar ruta" (HabilitarRutaDiaria) y "Vincular al plan" (AsignarRutaAHoja), para que
 * ambas pantallas apliquen exactamente el mismo criterio: un bus puede hacer varios viajes el mismo día
 * siempre que sus horarios no se solapen.
 */

import type { Ruta } from '../Entities/Ruta';
import { EstadoRuta } from '../Constants/EstadosSistema';

/** Duración que se supone para un viaje cuando no se conoce su hora de llegada ni su tiempo de viaje. */
export const DURACION_POR_DEFECTO_MINUTOS = 180;

const MINUTOS_POR_DIA = 24 * 60;

/** Ocupación de un bus: minutos desde las 00:00 del día de salida; `fin` puede pasar de 1440 si llega al día siguiente. */
export interface IntervaloHorario {
  inicio: number;
  fin: number;
}

/** "08:30" o "08:30:00" -> 510. */
export function horaAMinutos(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number);
  return (horas || 0) * 60 + (minutos || 0);
}

/** 510 -> "08:30" (los minutos que pasan de un día se muestran como hora del día siguiente). */
export function minutosAHora(minutos: number): string {
  const normalizados = ((minutos % MINUTOS_POR_DIA) + MINUTOS_POR_DIA) % MINUTOS_POR_DIA;
  const dosDigitos = (n: number) => String(n).padStart(2, '0');
  return `${dosDigitos(Math.floor(normalizados / 60))}:${dosDigitos(normalizados % 60)}`;
}

/**
 * Intervalo que ocupa un viaje: usa la hora de llegada si se conoce; si no, el tiempo de viaje; y si tampoco,
 * la duración por defecto. Una llegada anterior a la salida significa que llega al día siguiente.
 */
export function crearIntervalo(
  salida: string,
  llegada?: string | null,
  duracionMinutos?: number | null,
): IntervaloHorario {
  const inicio = horaAMinutos(salida);
  let fin = llegada
    ? horaAMinutos(llegada)
    : inicio + (duracionMinutos && duracionMinutos > 0 ? duracionMinutos : DURACION_POR_DEFECTO_MINUTOS);

  if (fin <= inicio) fin += MINUTOS_POR_DIA;

  return { inicio, fin };
}

/** Intervalo de una ruta ya registrada; null si no tiene hora de salida (horario desconocido). */
export function intervaloDeRuta(
  ruta: Pick<Ruta, 'horaSalida' | 'horaLlegada' | 'tiempoViajeMinutos'>,
): IntervaloHorario | null {
  if (!ruta.horaSalida) return null;
  return crearIntervalo(ruta.horaSalida, ruta.horaLlegada, ruta.tiempoViajeMinutos);
}

/** Dos viajes se solapan si cada uno empieza antes de que el otro termine (llegar justo cuando el otro sale no cuenta). */
export function intervalosSeSolapan(a: IntervaloHorario, b: IntervaloHorario): boolean {
  return a.inicio < b.fin && b.inicio < a.fin;
}

/** Rutas de un día cercano a la fecha del viaje: -1 = el día anterior, 0 = el mismo día, 1 = el día siguiente. */
export interface RutasDeUnDia {
  desfaseDias: -1 | 0 | 1;
  rutas: readonly Ruta[];
}

export interface ConflictoHorario {
  ruta: Ruta;
  /** Horario que ocupa la ruta en conflicto; null si no tiene hora de salida registrada. */
  intervalo: IntervaloHorario | null;
}

export interface OpcionesConflicto {
  /** Ruta que se está modificando: no choca consigo misma. */
  ignorarRutaId?: number;
  /** Si es true, una ruta del mismo día sin hora conocida se considera ocupada (no se puede demostrar lo contrario). */
  sinHoraOcupa?: boolean;
}

/**
 * Busca, entre las rutas de un recurso (un bus o un chofer) del día anterior, del mismo día y del siguiente,
 * la primera cuyo horario choque con el del nuevo viaje. Mirar los días vecinos permite detectar los viajes
 * que cruzan la medianoche. Las rutas canceladas nunca ocupan al recurso.
 *
 * `nuevo` se expresa en minutos desde las 00:00 del día del nuevo viaje.
 */
export function buscarConflictoHorario(
  nuevo: IntervaloHorario,
  dias: readonly RutasDeUnDia[],
  opciones: OpcionesConflicto = {},
): ConflictoHorario | null {
  for (const { desfaseDias, rutas } of dias) {
    for (const ruta of rutas) {
      if (ruta.estado === EstadoRuta.CANCELADA) continue;
      if (opciones.ignorarRutaId !== undefined && ruta.id === opciones.ignorarRutaId) continue;

      const intervalo = intervaloDeRuta(ruta);
      if (intervalo === null) {
        if (opciones.sinHoraOcupa && desfaseDias === 0) return { ruta, intervalo: null };
        continue;
      }

      const desplazado = {
        inicio: intervalo.inicio + desfaseDias * MINUTOS_POR_DIA,
        fin: intervalo.fin + desfaseDias * MINUTOS_POR_DIA,
      };
      if (intervalosSeSolapan(nuevo, desplazado)) return { ruta, intervalo };
    }
  }

  return null;
}

/** "13:00–16:00", o "2026-11-09 22:00–06:00" si la ruta en conflicto es de otro día; vacío si no se conoce el horario. */
export function describirHorario(conflicto: ConflictoHorario, fechaDelViaje: string): string {
  if (!conflicto.intervalo) return '';
  const horas = `${minutosAHora(conflicto.intervalo.inicio)}–${minutosAHora(conflicto.intervalo.fin)}`;
  return conflicto.ruta.fecha === fechaDelViaje ? horas : `${conflicto.ruta.fecha} ${horas}`;
}
