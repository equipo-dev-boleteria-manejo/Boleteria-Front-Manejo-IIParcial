/**
 * ObtenerMapaAsientos.ts - Caso de uso para armar el mapa de una ruta.
 *
 * Concentra las consultas a los repositorios de asientos, tipos de asiento y
 * boletos. El composable de presentación solo recibe datos ya resueltos.
 */

import type { Asiento } from '../../Domain/Entities/Asiento';
import type { IAsientoRepository } from '../../Domain/Repositories/IAsientoRepository';
import type { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository';
import type { ISeatTypeRepository } from '../../Domain/Repositories/ISeatTypeRepository';
import { SupabaseAsientoRepository } from '../../Infrastructure/Repositories/SupabaseAsientoRepository';
import { SupabaseBoletosRepository } from '../../Infrastructure/Repositories/SupabaseBoletosRepository';
import { SupabaseSeatTypeRepository } from '../../Infrastructure/Repositories/SupabaseSeatTypeRepository';

export interface ObtenerMapaAsientosInput {
  rutaId: number;
  busId: number;
  totalAsientos: number;
  estructura?: string;
  tarifaBase?: number;
}

export interface MapaAsientosResultado {
  asientos: Asiento[];
  ocupados: number[];
  preciosPorTipo: Record<string, number>;
  tarifaBase: number;
}

const TARIFA_POR_DEFECTO = 10;

export class ObtenerMapaAsientos {
  constructor(
    private asientoRepo: IAsientoRepository = new SupabaseAsientoRepository(),
    private boletosRepo: IBoletosRepository = new SupabaseBoletosRepository(),
    private seatTypeRepo: ISeatTypeRepository = new SupabaseSeatTypeRepository(),
  ) {}

  async ejecutar(input: ObtenerMapaAsientosInput): Promise<MapaAsientosResultado> {
    const [tiposAsiento, asientos, ocupados] = await Promise.all([
      this.seatTypeRepo.obtenerActivos(),
      this.asientoRepo.asegurarAsientosDeBus(
        input.busId,
        input.totalAsientos,
        input.estructura,
      ),
      this.boletosRepo.obtenerAsientosOcupadosPorRuta(input.rutaId),
    ]);

    const preciosPorTipo = tiposAsiento.reduce<Record<string, number>>(
      (mapa, tipo) => {
        mapa[tipo.nombre] = tipo.precioBase;
        return mapa;
      },
      {},
    );

    const precios = Object.values(preciosPorTipo);
    const tarifaBase =
      input.tarifaBase && input.tarifaBase > 0
        ? input.tarifaBase
        : precios.length
          ? Math.min(...precios)
          : TARIFA_POR_DEFECTO;

    return {
      asientos,
      ocupados,
      preciosPorTipo,
      tarifaBase,
    };
  }
}
