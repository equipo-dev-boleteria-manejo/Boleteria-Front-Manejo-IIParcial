/**
 * SeatType.ts - Entidad de Dominio para Tipos de Asiento y Tarifas
 */

import {
  PrecioNegativoException,
  ColorHexInvalidoException,
} from '../Exceptions/SeatTypeException';

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

export class SeatType {
  public id?: number;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(
    public nombre: string,
    public colorHex: string,
    public precioBase: number,
    public descripcion?: string,
    public estado: boolean = true,
  ) {}

  esValido(): boolean {
    return (
      Boolean(this.nombre && this.nombre.trim().length >= 3) &&
      this.validarColorHex(this.colorHex) &&
      this.precioBase >= 0
    );
  }

  validarColorHex(color: string): boolean {
    return HEX_REGEX.test(color.trim());
  }

  actualizarPrecio(nuevoPrecio: number): void {
    if (nuevoPrecio < 0) {
      throw new PrecioNegativoException();
    }
    this.precioBase = nuevoPrecio;
    this.updatedAt = new Date();
  }

  actualizarColor(nuevoColor: string): void {
    if (!this.validarColorHex(nuevoColor)) {
      throw new ColorHexInvalidoException(nuevoColor);
    }
    this.colorHex = nuevoColor.trim();
    this.updatedAt = new Date();
  }

  desactivar(): void {
    this.estado = false;
    this.updatedAt = new Date();
  }

  activar(): void {
    this.estado = true;
    this.updatedAt = new Date();
  }

  estaActivo(): boolean {
    return this.estado;
  }
}

export class SeatTypeFactory {
  static crearNormal(): SeatType {
    return new SeatType('Normal', '#3498db', 10.0, 'Asiento clásico estándar');
  }

  static crearVIP(): SeatType {
    return new SeatType('VIP', '#e74c3c', 15.0, 'Asiento VIP con reclinación superior');
  }

  static crearEjecutivo(): SeatType {
    return new SeatType('Ejecutivo', '#f39c12', 12.5, 'Asiento semi-cama ejecutivo');
  }
}
