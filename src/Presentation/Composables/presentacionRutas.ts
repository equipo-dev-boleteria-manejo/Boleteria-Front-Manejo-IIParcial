/**
 * presentacionRutas.ts - Formateadores y modelos de presentación de Rutas y Hojas de Ruta
 *
 * Funciones puras compartidas por RutasAdmin, HojaRutaAdmin, TripList y ValidarQR: las vistas solo
 * renderizan estos datos y no calculan estilos, etiquetas ni conteos dentro del template.
 */

import { EstadoHojaRuta, EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import type { Bus } from '../../Domain/Entities/Bus';
import type { Frecuencia } from '../../Domain/Entities/Frecuencia';
import { frecuenciaAdmiteParadas } from '../../Domain/Rules/modalidadRuta';
import type { HojaRuta } from '../../Domain/Entities/HojaRuta';
import type { Ruta } from '../../Domain/Entities/Ruta';
import { fechaLocalISO } from '../../utils/fechaLocal';

const ETIQUETA_ESTADO_RUTA: Record<string, string> = {
  [EstadoRuta.PROGRAMADA]: 'Programada',
  [EstadoRuta.EN_CURSO]: 'En curso',
  [EstadoRuta.FINALIZADA]: 'Finalizada',
  [EstadoRuta.CANCELADA]: 'Cancelada',
};

/** "EnCurso" -> "En curso": el valor de dominio no se muestra tal cual al usuario. */
export function etiquetaEstadoRuta(estado?: string): string {
  if (!estado) return '—';
  return ETIQUETA_ESTADO_RUTA[estado] ?? estado;
}

export function claseBadgeEstadoRuta(estado?: string): string {
  switch (estado) {
    case EstadoRuta.PROGRAMADA:
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case EstadoRuta.EN_CURSO:
      return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
    case EstadoRuta.FINALIZADA:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case EstadoRuta.CANCELADA:
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function claseBadgeEstadoHoja(estado?: string): string {
  switch (estado) {
    case EstadoHojaRuta.BORRADOR:
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case EstadoHojaRuta.EMITIDA:
      return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
    case EstadoHojaRuta.CERRADA:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/** Opciones del filtro de estado de la barra de búsqueda de RutasAdmin. */
export const OPCIONES_FILTRO_ESTADO_RUTA: Array<{ value: string; label: string }> = [
  { value: 'Todas', label: 'Todas' },
  { value: EstadoRuta.PROGRAMADA, label: 'Programadas' },
  { value: EstadoRuta.EN_CURSO, label: 'En curso' },
  { value: EstadoRuta.FINALIZADA, label: 'Finalizadas' },
  { value: EstadoRuta.CANCELADA, label: 'Canceladas' },
];

export { fechaLocalISO };

/** Una ruta programada para una fecha posterior a hoy todavía no puede iniciarse. */
export function motivoInicioBloqueado(fecha: string, hoy: string = fechaLocalISO()): string {
  return fecha > hoy ? `Solo se puede iniciar el día del viaje (${fecha}).` : '';
}

export function etiquetaModalidad(esDirecta: boolean): string {
  return esDirecta ? 'Directo' : 'Con paradas';
}

export function rutaTieneIncidente(ruta: Pick<Ruta, 'observacionChofer'>): boolean {
  return (ruta.observacionChofer ?? '').toUpperCase().includes('INCIDENTE');
}

export function etiquetaBus(busId: number, buses: readonly Bus[]): string {
  const bus = buses.find((item) => item.id === busId);
  return bus ? `Bus #${bus.numero} (${bus.placa})` : `Unidad #${busId}`;
}

export function etiquetaChofer(
  choferId: string | undefined,
  choferes: readonly { id: string; nombreCompleto: string }[],
): string {
  if (!choferId) return 'Sin chofer asignado';
  return choferes.find((chofer) => chofer.id === choferId)?.nombreCompleto ?? 'Chofer asignado (no activo)';
}

/** Choferes que se pueden asignar a una ruta: todos menos el que ya tiene (reasignarlo no cambiaría nada). */
export function choferesDisponibles<T extends { id: string }>(choferActualId: string | undefined, choferes: readonly T[]): T[] {
  return choferes.filter((chofer) => chofer.id !== choferActualId);
}

/** Texto del marcador del selector: asignar si la ruta no tiene chofer, cambiar si ya tiene. */
export function textoSelectorChofer(choferActualId: string | undefined): string {
  return choferActualId ? 'Cambiar chofer…' : 'Asignar chofer…';
}

/** Ordena por hora de salida; las rutas sin hora quedan al final y el orden original se conserva. */
export function ordenarPorHora<T extends { horaSalida?: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    if (!a.horaSalida && !b.horaSalida) return 0;
    if (!a.horaSalida) return 1;
    if (!b.horaSalida) return -1;
    return a.horaSalida.localeCompare(b.horaSalida);
  });
}

export interface FilaTrayecto {
  clave: string;
  ruta: Ruta;
  hora: string;
  llegada: string | null;
  bus: string;
  modalidad: string;
  esDirecta: boolean;
  estado: string;
  claseEstado: string;
  /** La modalidad solo puede cambiarse antes de iniciar el viaje. */
  puedeCambiarModalidad: boolean;
  puedeIniciar: boolean;
  /** Motivo por el que "Iniciar" está bloqueado (por ejemplo, un viaje de otra fecha); vacío si se puede. */
  iniciarBloqueadoPor: string;
  puedeFinalizar: boolean;
  puedeCancelar: boolean;
}

export function aFilaTrayecto(
  ruta: Ruta,
  buses: readonly Bus[],
  hoy: string = fechaLocalISO(),
  frecuencias: readonly Frecuencia[] = [],
): FilaTrayecto {
  const programada = ruta.estado === EstadoRuta.PROGRAMADA;
  // Una ruta solo puede pasar a "con paradas" si su frecuencia las tiene; salir directo siempre es posible.
  const frecuencia = frecuencias.find((item) => item.id === ruta.frecuenciaId);
  const admiteParadas = frecuencia ? frecuenciaAdmiteParadas(frecuencia) : true;

  return {
    clave: ruta.id ? String(ruta.id) : `${ruta.busId}-${ruta.frecuenciaId}-${ruta.horaSalida ?? ''}`,
    ruta,
    hora: ruta.horaSalida || '--:--',
    llegada: ruta.horaLlegada || null,
    bus: etiquetaBus(ruta.busId, buses),
    modalidad: etiquetaModalidad(ruta.esDirecta),
    esDirecta: ruta.esDirecta,
    estado: etiquetaEstadoRuta(ruta.estado),
    claseEstado: claseBadgeEstadoRuta(ruta.estado),
    puedeCambiarModalidad: programada && (!ruta.esDirecta || admiteParadas),
    puedeIniciar: programada,
    iniciarBloqueadoPor: programada ? motivoInicioBloqueado(ruta.fecha, hoy) : '',
    puedeFinalizar: ruta.estado === EstadoRuta.EN_CURSO,
    puedeCancelar: programada,
  };
}

/**
 * Una hoja Cerrada (por cierre o por cancelación) es definitiva: ya no admite más trayectos ni puede
 * reabrirse, y solo existe una hoja por fecha. Sin hojas, el primer trayecto crea la del día.
 */
export function fechaAdmiteTrayectos(hojas: readonly HojaRuta[]): boolean {
  return hojas.every((hoja) => hoja.estado !== EstadoHojaRuta.CERRADA);
}

export interface ResumenHojas {
  hojas: number;
  trayectos: number;
  programados: number;
  enCurso: number;
  finalizados: number;
}

/** Cifras para las tarjetas de métricas de HojaRutaAdmin. */
export function resumirHojas(hojas: readonly HojaRuta[]): ResumenHojas {
  const rutas = hojas.flatMap((hoja) => hoja.rutas ?? []);

  return {
    hojas: hojas.length,
    trayectos: rutas.length,
    programados: rutas.filter((ruta) => ruta.estado === EstadoRuta.PROGRAMADA).length,
    enCurso: rutas.filter((ruta) => ruta.estado === EstadoRuta.EN_CURSO).length,
    finalizados: rutas.filter((ruta) => ruta.estado === EstadoRuta.FINALIZADA).length,
  };
}
