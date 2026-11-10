/**
 * ResolverPrecioAsiento.ts - Resuelve la tarifa oficial de cada asiento.
 *
 * El precio nunca se toma del navegador: se consulta el asiento y se cruza su
 * tipo con la tabla de tarifas (`SeatTypes`). Así una petición manipulada no
 * puede comprar boletos más baratos.
 */

import type { IAsientoRepository } from '../../Domain/Repositories/IAsientoRepository';
import type { ISeatTypeRepository } from '../../Domain/Repositories/ISeatTypeRepository';
import { SupabaseAsientoRepository } from '../../Infrastructure/Repositories/SupabaseAsientoRepository';
import { SupabaseSeatTypeRepository } from '../../Infrastructure/Repositories/SupabaseSeatTypeRepository';
import { DomainException } from '../../Domain/Exceptions/DomainException';

export class ResolverPrecioAsiento {
  constructor(
    private asientoRepo: IAsientoRepository = new SupabaseAsientoRepository(),
    private seatTypeRepo: ISeatTypeRepository = new SupabaseSeatTypeRepository(),
  ) {}

  /**
   * Devuelve un mapa `asientoId -> precioBase`. Lanza si algún asiento no
   * existe o si su tipo no tiene una tarifa activa configurada.
   */
  async ejecutar(asientoIds: number[]): Promise<Map<number, number>> {
    const ids = Array.from(new Set(asientoIds));
    if (!ids.length) {
      throw new DomainException(
        'Debe seleccionar al menos un asiento.',
        'ASIENTOS_REQUERIDOS',
      );
    }

    const tipos = await this.seatTypeRepo.obtenerTodos();
    const preciosPorTipo = new Map<string, number>();
    tipos.forEach((tipo) => {
      preciosPorTipo.set(tipo.nombre.trim().toLowerCase(), tipo.precioBase);
    });

    const precios = new Map<number, number>();

    for (const asientoId of ids) {
      const asiento = await this.asientoRepo.obtenerPorId(asientoId);
      if (!asiento) {
        throw new DomainException(
          `El asiento ${asientoId} no existe.`,
          'ASIENTO_NO_ENCONTRADO',
        );
      }

      const clave = asiento.tipo.trim().toLowerCase();
      const precio = preciosPorTipo.get(clave);
      if (precio === undefined || !Number.isFinite(precio) || precio <= 0) {
        throw new DomainException(
          `No existe una tarifa configurada para el tipo "${asiento.tipo}".`,
          'TARIFA_NO_CONFIGURADA',
        );
      }

      precios.set(asientoId, precio);
    }

    return precios;
  }
}
