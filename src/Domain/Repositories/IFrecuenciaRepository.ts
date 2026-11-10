/**
 * IFrecuenciaRepository.ts - Contrato de repositorio para Frecuencias y Paradas
 */

import type {
  DiaOperacion,
  Frecuencia,
  ParadaIntermedia,
} from "../Entities/Frecuencia";

export interface FrecuenciaFiltros {
  cooperativaId?: number;
  ciudadOrigen?: string;
  ciudadDestino?: string;
  dia?: DiaOperacion;
  soloActivas?: boolean;
}

export interface IFrecuenciaRepository {
  obtenerTodas(filtros?: FrecuenciaFiltros): Promise<Frecuencia[]>;
  obtenerPorId(id: number): Promise<Frecuencia | null>;
  obtenerPorCooperativa(cooperativaId: number): Promise<Frecuencia[]>;
  obtenerPorIdentificador(
    cooperativaId: number,
    identificadorFrecuencia: string,
  ): Promise<Frecuencia | null>;
  buscarPorTramo(
    origen: string,
    destino: string,
    dia?: DiaOperacion,
  ): Promise<Frecuencia[]>;
  crear(frecuencia: Frecuencia): Promise<Frecuencia>;
  actualizar(id: number, cambios: Partial<Frecuencia>): Promise<Frecuencia>;
  desactivar(id: number): Promise<void>;

  obtenerParadas(frecuenciaId: number): Promise<ParadaIntermedia[]>;
  agregarParada(
    frecuenciaId: number,
    parada: ParadaIntermedia,
  ): Promise<ParadaIntermedia>;
  actualizarParada(
    id: number,
    cambios: Partial<ParadaIntermedia>,
  ): Promise<ParadaIntermedia>;
  eliminarParada(id: number): Promise<void>;
}
