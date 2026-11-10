/**
 * Cedula.ts - Value Object para Cédula de Identidad Ecuatoriana
 *
 * Encapsula la regla de validación de 10 dígitos y algoritmo Módulo 10 oficial
 * del Registro Civil del Ecuador (código de provincia 01-24 o 30, tercer dígito < 6).
 */

import { InvalidCedulaException } from '../Exceptions/InvalidCedulaException';

const COEFICIENTES = [2, 1, 2, 1, 2, 1, 2, 1, 2];

export class Cedula {
  private readonly _valor: string;

  constructor(valor: string) {
    const limpia = valor ? valor.trim() : '';

    if (!Cedula.validar(limpia)) {
      throw new InvalidCedulaException(limpia);
    }

    this._valor = limpia;
  }

  static crear(valor: string): Cedula {
    return new Cedula(valor);
  }

  static validar(cedula: string): boolean {
    if (!cedula || typeof cedula !== 'string') return false;
    if (!/^\d{10}$/.test(cedula)) return false;

    const provincia = parseInt(cedula.substring(0, 2), 10);
    if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) {
      return false;
    }

    const tercerDigito = parseInt(cedula.charAt(2), 10);
    if (tercerDigito >= 6) {
      return false;
    }

    let suma = 0;
    for (let i = 0; i < 9; i++) {
      const digito = parseInt(cedula.charAt(i), 10);
      let producto = digito * COEFICIENTES[i];
      if (producto >= 10) {
        producto -= 9;
      }
      suma += producto;
    }

    const residuo = suma % 10;
    const digitoVerificador = residuo === 0 ? 0 : 10 - residuo;

    return digitoVerificador === parseInt(cedula.charAt(9), 10);
  }

  get valor(): string {
    return this._valor;
  }

  equals(otra: Cedula): boolean {
    if (!otra || !(otra instanceof Cedula)) return false;
    return this._valor === otra.valor;
  }

  toString(): string {
    return this._valor;
  }
}
