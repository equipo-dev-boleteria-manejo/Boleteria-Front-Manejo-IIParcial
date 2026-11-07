/**
 * CalcularTarifaPasajero.ts - Caso de uso para tarifar un pasajero.
 *
 * Encapsula la edad, las reglas de descuento y la clasificación del pasajero.
 * Ni las vistas ni los composables deben replicar estas reglas.
 */

import type { Asiento } from '../../Domain/Entities/Asiento';
import type { TipoPasajero } from '../../Domain/Constants/EstadosSistema';
import { TipoPasajero as TiposPasajero } from '../../Domain/Constants/EstadosSistema';
import { calcularEdad } from '../../Domain/Services/DescuentoService';
import { CalcularDescuentoVenta } from './CalcularDescuentoVenta';
import type {
  DatosPasajeroSeleccion,
  PasajeroCalculado,
} from '../Dtos/PasajeroCompraDto';

export interface CalcularTarifaPasajeroInput {
  asiento: Asiento;
  datos: DatosPasajeroSeleccion;
  precioBase: number;
}

export class CalcularTarifaPasajero {
  constructor(
    private calcularDescuento: CalcularDescuentoVenta = new CalcularDescuentoVenta(),
  ) {}

  ejecutar(input: CalcularTarifaPasajeroInput): PasajeroCalculado {
    const { asiento, datos, precioBase } = input;
    const base: PasajeroCalculado = {
      ...datos,
      asientoId: asiento.id ?? 0,
      asientoNumero: asiento.numeroAsiento,
      precioBase,
      precioFinal: precioBase,
      descuentoAplicado: 0,
      esMenor: false,
      esDiscapacitado: false,
      esTerceraEdad: false,
      tipoPasajero: TiposPasajero.GENERAL,
      valido: false,
      error: null,
    };

    if (
      !datos.nombres.trim() ||
      !datos.apellidos.trim() ||
      !datos.cedula.trim() ||
      !datos.fechaNacimiento
    ) {
      return {
        ...base,
        error: 'Completa nombres, apellidos, cédula y fecha de nacimiento.',
      };
    }

    const edad = calcularEdad(datos.fechaNacimiento);
    if (edad < 0) {
      return { ...base, error: 'La fecha de nacimiento no es válida.' };
    }

    try {
      const resultado = this.calcularDescuento.ejecutar({
        numeroCedula: datos.cedula.trim(),
        edad,
        tieneDiscapacidad: datos.tieneDiscapacidad,
        precioBase,
      });

      const esDiscapacitado = resultado.categoria === 'DISCAPACIDAD';
      const esTerceraEdad = resultado.categoria === 'TERCERA_EDAD';
      const esMenor = resultado.categoria === 'MENOR';

      let tipoPasajero: TipoPasajero = TiposPasajero.GENERAL;
      if (esDiscapacitado) tipoPasajero = TiposPasajero.DISCAPACITADO;
      else if (esTerceraEdad) tipoPasajero = TiposPasajero.TERCERA_EDAD;
      else if (esMenor) tipoPasajero = TiposPasajero.MENOR_EDAD;

      return {
        ...base,
        precioFinal: resultado.precioFinal,
        descuentoAplicado: resultado.porcentajeDescuento,
        esMenor,
        esDiscapacitado,
        esTerceraEdad,
        tipoPasajero,
        valido: true,
        error: null,
      };
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'Datos del pasajero inválidos.';
      return {
        ...base,
        error: mensaje.replace(/^\[[^\]]+\]\s*/, ''),
      };
    }
  }
}
