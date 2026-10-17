import { DomainException } from './DomainException';

export class SeatTypeException extends DomainException {
  constructor(message: string) {
    super(`[SeatTypeException] ${message}`);
  }
}
 
export class SeatTypeNoEncontradoException extends SeatTypeException {
  constructor(seatTypeId: string) {
    super(`Tipo de asiento ${seatTypeId} no encontrado`);
  }
}
 
export class SeatTypeInvalidoException extends SeatTypeException {
  constructor(mensaje?: string) {
    super(
      mensaje ||
      'El tipo de asiento contiene datos inválidos. Verifica nombre, color y precio'
    );
  }
}
 
export class ColorHexInvalidoException extends SeatTypeException {
  constructor(color: string) {
    super(`El color ${color} no es un hexadecimal válido (ej: #FF5733)`);
  }
}
 
export class NombreSeatTypeDuplicadoException extends SeatTypeException {
  constructor(nombre: string) {
    super(`Ya existe un tipo de asiento llamado "${nombre}"`);
  }
}
 
export class PrecioNegativoException extends SeatTypeException {
  constructor() {
    super('El precio del asiento no puede ser negativo');
  }
}
 
export class SeatTypeNoActivoException extends SeatTypeException {
  constructor(seatTypeId: string) {
    super(`El tipo de asiento ${seatTypeId} no está activo`);
  }
}