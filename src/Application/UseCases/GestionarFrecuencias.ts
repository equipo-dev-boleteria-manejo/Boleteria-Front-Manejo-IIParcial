/**
 * GestionarFrecuencias.ts - Caso de Uso: consulta y mantenimiento de frecuencias y paradas
 *
 * Arquitectura:
 * - Inversión de Dependencias (DIP): recibe IFrecuenciaRepository por constructor.
 * - Cero acoplamiento a Vue, DOM o Supabase directo.
 * - No muta colecciones de dominio: las paradas se agregan, actualizan y eliminan
 *   mediante el repositorio, que valida las invariantes de la frecuencia.
 */

import { ParadaIntermedia, type DiaOperacion, type Frecuencia } from '../../Domain/Entities/Frecuencia';
import type { FrecuenciaFiltros, IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import {
  FrecuenciaInvalidaException,
  FrecuenciaNoEncontradaException,
  ParadaInvalidaException,
} from '../../Domain/Exceptions/FrecuenciaException';
import { SupabaseFrecuenciaRepository } from '../../Infrastructure/Repositories/SupabaseFrecuenciaRepository';
import type { ActualizarFrecuenciaDto, ParadaIntermediaDto } from '../Dtos/CrearFrecuenciaDto';

export class GestionarFrecuenciasUseCase {
  constructor(private readonly frecuenciaRepo: IFrecuenciaRepository) {}

  async listar(filtros?: FrecuenciaFiltros): Promise<Frecuencia[]> {
    return await this.frecuenciaRepo.obtenerTodas(filtros);
  }

  async obtenerPorCooperativa(cooperativaId: number): Promise<Frecuencia[]> {
    this.validarId(cooperativaId, 'cooperativa');
    return await this.frecuenciaRepo.obtenerPorCooperativa(cooperativaId);
  }

  async obtenerPorId(id: number): Promise<Frecuencia> {
    this.validarId(id, 'frecuencia');
    const frecuencia = await this.frecuenciaRepo.obtenerPorId(id);
    if (!frecuencia) throw new FrecuenciaNoEncontradaException(id);
    return frecuencia;
  }

  async buscarPorTramo(origen: string, destino: string, dia?: DiaOperacion): Promise<Frecuencia[]> {
    if (!origen?.trim() || !destino?.trim()) {
      throw new FrecuenciaInvalidaException('El origen y el destino son requeridos para buscar frecuencias');
    }
    return await this.frecuenciaRepo.buscarPorTramo(origen.trim(), destino.trim(), dia);
  }

  async actualizar(id: number, cambios: ActualizarFrecuenciaDto): Promise<Frecuencia> {
    this.validarId(id, 'frecuencia');
    if (Object.keys(cambios).length === 0) {
      throw new FrecuenciaInvalidaException('No se indicaron cambios para la frecuencia');
    }
    return await this.frecuenciaRepo.actualizar(id, cambios);
  }

  async activar(id: number): Promise<Frecuencia> {
    this.validarId(id, 'frecuencia');
    return await this.frecuenciaRepo.actualizar(id, { activa: true });
  }

  async desactivar(id: number): Promise<void> {
    await this.obtenerPorId(id);
    await this.frecuenciaRepo.desactivar(id);
  }

  async agregarParada(frecuenciaId: number, dto: ParadaIntermediaDto): Promise<ParadaIntermedia> {
    this.validarId(frecuenciaId, 'frecuencia');
    return await this.frecuenciaRepo.agregarParada(frecuenciaId, this.construirParada(dto));
  }

  async actualizarParada(paradaId: number, cambios: Partial<ParadaIntermediaDto>): Promise<ParadaIntermedia> {
    this.validarId(paradaId, 'parada');
    if (Object.keys(cambios).length === 0) {
      throw new ParadaInvalidaException('No se indicaron cambios para la parada');
    }
    return await this.frecuenciaRepo.actualizarParada(paradaId, cambios);
  }

  async eliminarParada(paradaId: number): Promise<void> {
    this.validarId(paradaId, 'parada');
    await this.frecuenciaRepo.eliminarParada(paradaId);
  }

  private construirParada(dto: ParadaIntermediaDto): ParadaIntermedia {
    const parada = new ParadaIntermedia(
      (dto.ciudad ?? '').trim(),
      dto.orden,
      dto.minutosDesdeOrigen,
      dto.permiteVenta,
      dto.costoProporcional,
    );
    if (!parada.esValida()) throw new ParadaInvalidaException();
    return parada;
  }

  private validarId(id: number, entidad: string): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new FrecuenciaInvalidaException(`El identificador de ${entidad} no es válido: ${id}`);
    }
  }
}

// Instancia por defecto lista para ser consumida en la capa de presentación
export const gestionarFrecuenciasUseCase = new GestionarFrecuenciasUseCase(new SupabaseFrecuenciaRepository());
