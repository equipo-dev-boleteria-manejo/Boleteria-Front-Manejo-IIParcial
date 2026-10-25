/**
 * AsignarBusAFrecuenciaDto.ts - DTO de entrada para asignar un bus a una frecuencia en una fecha
 */

export interface AsignarBusAFrecuenciaDto {
  frecuenciaId: number;
  busId: number;
  /** Fecha del viaje en formato ISO (YYYY-MM-DD). */
  fecha: string;
}
