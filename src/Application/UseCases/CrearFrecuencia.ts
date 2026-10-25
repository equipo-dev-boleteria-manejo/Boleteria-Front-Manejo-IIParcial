/**
 * CrearFrecuencia.ts - Caso de Uso: registrar una frecuencia con sus paradas intermedias
 *
 * Arquitectura:
 * - Inversión de Dependencias (DIP): recibe IFrecuenciaRepository por constructor.
 * - Cero acoplamiento a Vue, DOM o Supabase directo.
 * - Las paradas se cargan mediante los métodos de dominio de la entidad.
 */

import { Frecuencia, ParadaIntermedia } from '../../Domain/Entities/Frecuencia';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import {
  FrecuenciaInvalidaException,
  ParadaInvalidaException,
} from '../../Domain/Exceptions/FrecuenciaException';
import { SupabaseFrecuenciaRepository } from '../../Infrastructure/Repositories/SupabaseFrecuenciaRepository';
import type { CrearFrecuenciaDto } from '../Dtos/CrearFrecuenciaDto';

export class CrearFrecuenciaUseCase {
  constructor(private readonly frecuenciaRepo: IFrecuenciaRepository) {}

  /**
   * Construye la entidad desde el DTO, valida sus invariantes y la persiste.
   * El repositorio rechaza además los identificadores duplicados por cooperativa.
   */
  async execute(dto: CrearFrecuenciaDto): Promise<Frecuencia> {
    const frecuencia = new Frecuencia(
      dto.cooperativaId,
      (dto.ciudadOrigen ?? '').trim(),
      (dto.ciudadDestino ?? '').trim(),
      (dto.horaSalida ?? '').trim(),
      (dto.identificadorFrecuencia ?? '').trim(),
      dto.esDirecto,
      dto.diasOperacion,
    );
    frecuencia.codigoAnt = dto.codigoAnt?.trim() || undefined;
    frecuencia.resolucionAnt = dto.resolucionAnt?.trim() || undefined;

    if (!frecuencia.esValida()) {
      throw new FrecuenciaInvalidaException();
    }

    const paradas = (dto.paradas ?? []).map(
      (parada) =>
        new ParadaIntermedia(
          parada.ciudad,
          parada.orden,
          parada.minutosDesdeOrigen,
          parada.permiteVenta,
          parada.costoProporcional,
        ),
    );
    frecuencia.establecerParadas(paradas);

    if (!frecuencia.paradasSonValidas()) {
      throw new ParadaInvalidaException();
    }

    return await this.frecuenciaRepo.crear(frecuencia);
  }

  /** Alias en español para mantener compatibilidad con las convenciones del equipo. */
  async ejecutar(dto: CrearFrecuenciaDto): Promise<Frecuencia> {
    return this.execute(dto);
  }
}

// Instancia por defecto lista para ser consumida en la capa de presentación
export const crearFrecuenciaUseCase = new CrearFrecuenciaUseCase(new SupabaseFrecuenciaRepository());
