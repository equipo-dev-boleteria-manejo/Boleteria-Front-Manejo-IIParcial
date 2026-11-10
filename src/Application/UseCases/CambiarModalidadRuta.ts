import type { Ruta } from '../../Domain/Entities/Ruta';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import {
  RutaNoEncontradaException,
  RutaModalidadNoPermitidaException,
  RutaNoModificableException,
} from '../../Domain/Exceptions/RutaException';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import { frecuenciaAdmiteParadas } from '../../Domain/Rules/modalidadRuta';
import { SupabaseRutaRepository } from '../../Infrastructure/Repositories/SupabaseRutaRepository';
import { SupabaseFrecuenciaRepository } from '../../Infrastructure/Repositories/SupabaseFrecuenciaRepository';

export class CambiarModalidadRuta {
  constructor(
    private readonly rutaRepository: IRutaRepository,
    /** Si se inyecta, se valida que una ruta solo salga "con paradas" cuando su frecuencia las tiene. */
    private readonly frecuenciaRepository?: IFrecuenciaRepository,
  ) {}

  async ejecutar(rutaId: number, esDirecta: boolean): Promise<Ruta> {
    const ruta = await this.rutaRepository.obtenerPorId(rutaId);

    if (!ruta) {
      throw new RutaNoEncontradaException(rutaId);
    }

    if (!ruta.puedeModificarse()) {
      throw new RutaNoModificableException(rutaId, ruta.estado);
    }

    if (!esDirecta && this.frecuenciaRepository) {
      const frecuencia = await this.frecuenciaRepository.obtenerPorId(ruta.frecuenciaId);
      if (frecuencia && !frecuenciaAdmiteParadas(frecuencia)) {
        throw new RutaModalidadNoPermitidaException(
          'La frecuencia de esta ruta es directa: no tiene paradas intermedias.',
        );
      }
    }

    return this.rutaRepository.actualizar(rutaId, { esDirecta });
  }
}

export const cambiarModalidadRutaUseCase = new CambiarModalidadRuta(
  new SupabaseRutaRepository(),
  new SupabaseFrecuenciaRepository(),
);
