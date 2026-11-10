import type { Ruta } from '../../Domain/Entities/Ruta';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import {
  RutaNoEncontradaException,
  RutaNoModificableException,
} from '../../Domain/Exceptions/RutaException';
import { SupabaseRutaRepository } from '../../Infrastructure/Repositories/SupabaseRutaRepository';

export class CambiarModalidadRuta {
  constructor(private readonly rutaRepository: IRutaRepository) {}

  async ejecutar(rutaId: number, esDirecta: boolean): Promise<Ruta> {
    const ruta = await this.rutaRepository.obtenerPorId(rutaId);

    if (!ruta) {
      throw new RutaNoEncontradaException(rutaId);
    }

    if (!ruta.puedeModificarse()) {
      throw new RutaNoModificableException(rutaId, ruta.estado);
    }

    return this.rutaRepository.actualizar(rutaId, { esDirecta });
  }
}

export const cambiarModalidadRutaUseCase = new CambiarModalidadRuta(
  new SupabaseRutaRepository(),
);
