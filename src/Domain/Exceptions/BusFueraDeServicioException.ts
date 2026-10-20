import { BusException } from './BusException';

export class BusFueraDeServicioException extends BusException {
  constructor(busId: string | number) {
    super(`El bus ${busId} ya está Fuera de Servicio o no puede cambiar a este estado.`, 'BUS_OUT_OF_SERVICE');
  }
}

export class BusNoDisponibleParaReactivarException extends BusException {
  constructor(busId: string | number, estadoActual: string) {
    super(`No se puede reactivar el bus ${busId}. Estado actual: ${estadoActual}`, 'BUS_CANNOT_REACTIVATE');
  }
}
