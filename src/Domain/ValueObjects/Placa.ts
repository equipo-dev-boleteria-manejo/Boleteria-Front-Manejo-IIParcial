/**
 * Placa.ts - Value Object para Placa Vehicular Ecuatoriana (ANT)
 *
 * Encapsula las reglas de formato oficial emitidas por la Agencia Nacional de Tránsito:
 * - 3 letras mayúsculas, donde la primera letra identifica la provincia de matriculación.
 * - Guion separador opcional u obligatorio según normalización.
 * - 3 a 4 dígitos numéricos (ej. PBA-1234 o PBA-254).
 */

import { BusInvalidoException } from '../Exceptions/BusException';

export const PROVINCIAS_ECUADOR: Record<string, string> = {
  A: 'Azuay',
  B: 'Bolívar',
  C: 'Carchi',
  E: 'Esmeraldas',
  G: 'Guayas',
  H: 'Chimborazo',
  I: 'Imbabura',
  J: 'Santo Domingo de los Tsáchilas',
  K: 'Sucumbíos',
  L: 'Loja',
  M: 'Manabí',
  N: 'Napo',
  O: 'El Oro',
  P: 'Pichincha',
  Q: 'Orellana',
  R: 'Los Ríos',
  S: 'Pastaza',
  T: 'Tungurahua',
  U: 'Cañar',
  V: 'Morona Santiago',
  W: 'Galápagos',
  X: 'Cotopaxi',
  Y: 'Santa Elena',
  Z: 'Zamora Chinchipe',
};

export class Placa {
  private readonly _valor: string;

  constructor(valor: string) {
    const limpia = Placa.normalizar(valor);

    if (!Placa.validar(limpia)) {
      throw new BusInvalidoException(
        `La placa '${valor}' no cumple con el formato vehicular oficial de Ecuador (ej. PBA-1234 o PBA-254).`,
      );
    }

    this._valor = limpia;
  }

  static crear(valor: string): Placa {
    return new Placa(valor);
  }

  /**
   * Sanitiza y normaliza la placa:
   * - Elimina espacios y caracteres especiales al inicio y final.
   * - Convierte a mayúsculas.
   * - Asegura el guion separador entre las 3 letras y los dígitos si se ingresó sin él (ej: PBA1234 -> PBA-1234).
   */
  static normalizar(placa: string): string {
    if (!placa || typeof placa !== 'string') return '';

    // Remueve caracteres no alfanuméricos excepto guiones
    let limpia = placa.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');

    // Elimina guiones iniciales o repetidos (ej: -PBA-254 -> PBA-254)
    limpia = limpia.replace(/^-+/, '').replace(/-+/g, '-');

    // Si tiene formato AAA1234 o AAA123 sin guion, inserta el guion
    const sinGuionMatch = limpia.match(/^([A-Z]{3})(\d{3,4})$/);
    if (sinGuionMatch) {
      limpia = `${sinGuionMatch[1]}-${sinGuionMatch[2]}`;
    }

    return limpia;
  }

  /**
   * Valida si una cadena cumple con el formato vehicular ecuatoriano:
   * - 3 letras mayúsculas válidas (la primera debe corresponder a una provincia).
   * - Un guion.
   * - 3 o 4 dígitos.
   */
  static validar(placa: string): boolean {
    if (!placa || typeof placa !== 'string') return false;

    const normalizada = Placa.normalizar(placa);
    const regex = /^([A-Z]{3})-(\d{3,4})$/;
    const match = normalizada.match(regex);

    if (!match) return false;

    const [_, letras] = match;
    const letraProvincia = letras.charAt(0);

    return letraProvincia in PROVINCIAS_ECUADOR;
  }

  /**
   * Obtiene el nombre de la provincia según la primera letra de la placa.
   */
  static obtenerProvincia(placa: string): string | null {
    if (!placa) return null;
    const normalizada = Placa.normalizar(placa);
    if (normalizada.length === 0) return null;

    const primeraLetra = normalizada.charAt(0);
    return PROVINCIAS_ECUADOR[primeraLetra] ?? null;
  }

  get valor(): string {
    return this._valor;
  }

  get provincia(): string {
    return Placa.obtenerProvincia(this._valor) ?? 'Desconocida';
  }

  toString(): string {
    return this._valor;
  }
}
