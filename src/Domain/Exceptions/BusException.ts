import { DomainException } from './DomainException';
 
export class BusException extends DomainException {
  constructor(message: string) {
    super(`[BusException] ${message}`);
  }
}
 
export class BusNoEncontradoException extends BusException {
  constructor(busId: string) {
    super(`Bus con ID ${busId} no encontrado`);
  }
}
 
export class BusInvalidoException extends BusException {
  constructor(mensaje?: string) {
    super(
      mensaje ||
      'El bus contiene datos inválidos. Verifica el número, placa, chasis y carrocería'
    );
  }
}
 
export class PlacaDuplicadaException extends BusException {
  constructor(placa: string) {
    super(`La placa ${placa} ya existe en el sistema`);
  }
}
 
export class NumeroBusDuplicadoException extends BusException {
  constructor(numero: number) {
    super(`El número de bus ${numero} ya existe para esta cooperativa`);
  }
}
 
export class CapacidadInsuficienteException extends BusException {
  constructor(tipoAsiento: string, disponibles: number) {
    super(
      `No hay suficientes asientos disponibles de tipo ${tipoAsiento}. Disponibles: ${disponibles}`
    );
  }
}
 
export class BusNoActivoException extends BusException {
  constructor(busId: string) {
    super(`El bus ${busId} no está activo para venta`);
  }
}