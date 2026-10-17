import { DomainException } from './DomainException';

export class AsientoException extends DomainException {
  constructor(message: string) {
    super(`[AsientoException] ${message}`);
  }
}
 
export class AsientoNoDisponibleException extends AsientoException {
  constructor(numeroAsiento: string) {
    super(`El asiento ${numeroAsiento} no está disponible`);
  }
}
 
export class AsientoNoEncontradoException extends AsientoException {
  constructor(asientoId: string) {
    super(`Asiento ${asientoId} no encontrado`);
  }
}
 
export class NumeroAsientoDuplicadoException extends AsientoException {
  constructor(numeroAsiento: string, busId: string) {
    super(
      `El asiento ${numeroAsiento} ya existe en el bus ${busId}`
    );
  }
}