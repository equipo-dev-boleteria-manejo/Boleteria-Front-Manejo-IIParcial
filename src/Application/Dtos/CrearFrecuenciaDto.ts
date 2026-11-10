/**
 * CrearFrecuenciaDto.ts - DTOs de entrada para crear y modificar frecuencias y sus paradas
 */

import type { DiaOperacion } from '../../Domain/Entities/Frecuencia';

export interface ParadaIntermediaDto {
  ciudad: string;
  orden: number;
  minutosDesdeOrigen: number;
  permiteVenta?: boolean;
  costoProporcional?: number;
}

export interface CrearFrecuenciaDto {
  cooperativaId: number;
  ciudadOrigen: string;
  ciudadDestino: string;
  horaSalida: string;
  identificadorFrecuencia: string;
  esDirecto?: boolean;
  diasOperacion?: DiaOperacion[];
  codigoAnt?: string;
  resolucionAnt?: string;
  paradas?: ParadaIntermediaDto[];
}

/** Campos que se pueden modificar. La cooperativa y el identificador son inmutables. */
export type ActualizarFrecuenciaDto = Partial<
  Pick<
    CrearFrecuenciaDto,
    'ciudadOrigen' | 'ciudadDestino' | 'horaSalida' | 'esDirecto' | 'diasOperacion' | 'codigoAnt' | 'resolucionAnt'
  >
>;
