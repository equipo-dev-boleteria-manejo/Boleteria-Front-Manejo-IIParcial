import { DomainException } from './DomainException';

export class BusException extends DomainException {
  constructor(message: string, code: string = 'BUS_ERROR') {
    super(`[BusException] ${message}`, code);
  }
}

export class BusNoEncontradoException extends BusException {
  constructor(busId: number | string) {
    super(`Bus con ID ${busId} no encontrado`, 'BUS_NOT_FOUND');
  }
}

export class BusInvalidoException extends BusException {
  constructor(mensaje?: string) {
    super(
      mensaje || 'El bus contiene datos inválidos. Verifica el número, placa, cooperativa y total de asientos',
      'BUS_INVALID'
    );
  }
}

export class PlacaDuplicadaException extends BusException {
  constructor(placa: string) {
    super(`La placa ${placa} ya existe en el sistema`, 'PLACA_DUPLICATED');
  }
}

export class NumeroBusDuplicadoException extends BusException {
  constructor(numero: string, cooperativaId: number) {
    super(`El número de bus ${numero} ya existe para la cooperativa ${cooperativaId}`, 'BUS_NUMBER_DUPLICATED');
  }
}

export class BusNoActivoException extends BusException {
  constructor(busId: number | string, estado: string) {
    super(`El bus ${busId} no se encuentra activo para operar (Estado actual: ${estado})`, 'BUS_NOT_ACTIVE');
  }
}

export class MotivoIncidenteInvalidoException extends BusException {
  constructor(motivo: string, motivosValidos: readonly string[] = []) {
    const detalle = motivosValidos.length > 0
      ? `. Debe ser uno de: ${motivosValidos.join(', ')}`
      : '';
    super(`Motivo inválido: ${motivo}${detalle}`, 'BUS_INCIDENT_REASON_INVALID');
  }
}
