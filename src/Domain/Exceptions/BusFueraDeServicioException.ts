import { BusException } from './BusException';

export class BusFueraDeServicioException extends BusException {
  constructor(busId: string | number) {
    super(`El bus ${busId} ya está Fuera de Servicio o no puede cambiar a este estado.`);
  }
}

export class BusNoDisponibleParaReactivarException extends BusException {
  constructor(busId: string | number, estadoActual: string) {
    super(`No se puede reactivar el bus ${busId}. Estado actual: ${estadoActual}`);
  }
}

export class BusReemplazoNoValidoException extends BusException {
  constructor(replacementBusId: string | number, razon?: string) {
    super(`El bus de reemplazo ${replacementBusId} no es válido o no está disponible. ${razon || ''}`);
  }
}
