/**
 * SeatType.ts - Entidad de Dominio para Tipos de Asiento y Tarifas
 */

export class SeatType {
  id?: number | string;
  nombre: string;
  colorHex: string;
  precioBase: number;
  descripcion?: string;
  estado: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(
    nombre: string,
    colorHex: string,
    precioBase: number,
    descripcion?: string,
    estado: boolean = true,
    id?: number | string
  ) {
    this.id = id;
    this.nombre = nombre;
    this.colorHex = colorHex;
    this.precioBase = precioBase;
    this.descripcion = descripcion;
    this.estado = estado;
  }

  esValido(): boolean {
    return (
      this.nombre.trim().length >= 3 &&
      this.validarColorHex(this.colorHex) &&
      this.precioBase >= 0
    );
  }

  private validarColorHex(color: string): boolean {
    const hexRegex = /^#[0-9A-F]{6}$/i;
    return hexRegex.test(color);
  }

  actualizarPrecio(nuevoPrecio: number): void {
    if (nuevoPrecio < 0) {
      throw new Error('El precio no puede ser negativo');
    }
    this.precioBase = nuevoPrecio;
    this.updatedAt = new Date();
  }

  actualizarColor(nuevoColor: string): void {
    if (!this.validarColorHex(nuevoColor)) {
      throw new Error('El color debe ser un hexadecimal válido (ej: #FF5733)');
    }
    this.colorHex = nuevoColor;
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

  obtenerDatosUI(): {
    id?: number | string;
    nombre: string;
    color: string;
    precio: number;
    descripcion?: string;
  } {
    return {
      id: this.id,
      nombre: this.nombre,
      color: this.colorHex,
      precio: this.precioBase,
      descripcion: this.descripcion,
    };
  }
}

export enum TiposAsientoEstandar {
  NORMAL = 'NORMAL',
  VIP = 'VIP',
  EJECUTIVO = 'EJECUTIVO',
}

export class SeatTypeFactory {
  static crearNormal(): SeatType {
    return new SeatType('Normal', '#3498db', 10.0, 'Asiento estándar para pasajeros');
  }

  static crearVIP(): SeatType {
    return new SeatType('VIP', '#e74c3c', 20.0, 'Asiento de lujo con mayor comodidad');
  }

  static crearEjecutivo(): SeatType {
    return new SeatType('Ejecutivo', '#f39c12', 15.0, 'Asiento ejecutivo semi-premium');
  }
}