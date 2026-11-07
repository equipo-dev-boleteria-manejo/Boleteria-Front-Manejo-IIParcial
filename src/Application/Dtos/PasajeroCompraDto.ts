/**
 * PasajeroCompraDto.ts - DTOs compartidos por los casos de uso de compra.
 *
 * Se mantienen fuera del composable para que la lógica de presentación no sea
 * la dueña del contrato que consumen los casos de uso.
 */

import type { TipoPasajero } from '../../Domain/Constants/EstadosSistema';

export interface DatosPasajeroSeleccion {
  nombres: string;
  apellidos: string;
  cedula: string;
  fechaNacimiento: string;
  tieneDiscapacidad: boolean;
}

export interface PasajeroCalculado extends DatosPasajeroSeleccion {
  asientoId: number;
  asientoNumero: string;
  precioBase: number;
  precioFinal: number;
  descuentoAplicado: number;
  esMenor: boolean;
  esDiscapacitado: boolean;
  esTerceraEdad: boolean;
  tipoPasajero: TipoPasajero;
  valido: boolean;
  error: string | null;
}
