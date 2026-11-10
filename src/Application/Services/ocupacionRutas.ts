/**
 * ocupacionRutas.ts - Carga las rutas de un recurso (bus o chofer) del día anterior, del mismo día y del siguiente
 *
 * Con ellas la regla de solapamiento puede detectar los viajes que cruzan la medianoche.
 */

import type { Ruta } from '../../Domain/Entities/Ruta';
import type { RutasDeUnDia } from '../../Domain/Rules/solapamientoRutas';
import { sumarDias } from '../../utils/fechaLocal';

const DESFASES = [-1, 0, 1] as const;

/**
 * @param obtener consulta las rutas del recurso en una fecha concreta
 * @param rutasDelMismoDia si ya se conocen las rutas del propio día, se usan en lugar de consultarlas
 */
export async function cargarRutasAdyacentes(
  fecha: string,
  obtener: (fecha: string) => Promise<readonly Ruta[] | undefined>,
  rutasDelMismoDia?: readonly Ruta[],
): Promise<RutasDeUnDia[]> {
  return Promise.all(
    DESFASES.map(async (desfaseDias) => ({
      desfaseDias,
      rutas: (desfaseDias === 0 && rutasDelMismoDia) || (await obtener(sumarDias(fecha, desfaseDias))) || [],
    })),
  );
}
