/**
 * modalidadRuta.ts - Regla de dominio sobre la modalidad de una ruta (directa o con paradas)
 *
 * Una ruta solo puede salir "con paradas" si su frecuencia las tiene. Una frecuencia directa no tiene
 * paradas intermedias, así que no hay nada en qué detenerse. En cambio, una ruta de una frecuencia con
 * paradas sí puede salir directa un día concreto (servicio exprés).
 */

import type { Frecuencia } from '../Entities/Frecuencia';

/** ¿La frecuencia tiene paradas intermedias en las que una ruta pueda detenerse? */
export function frecuenciaAdmiteParadas(frecuencia: Pick<Frecuencia, 'esDirecto' | 'paradas'>): boolean {
  return !frecuencia.esDirecto && frecuencia.paradas.length > 0;
}
