/**
 * RutaException.ts - Excepciones de dominio para la gestión de Rutas (Viajes Operativos)
 */

import { DomainException } from './DomainException';

export class RutaException extends DomainException {
  constructor(message: string, code: string = 'RUTA_ERROR') {
    super(`[RutaException] ${message}`, code);
  }
}

export class RutaNoEncontradaException extends RutaException {
  constructor(id: number) {
    super(`Ruta / viaje operativo con ID ${id} no encontrado`, 'RUTA_NOT_FOUND');
  }
}

export class RutaInvalidaException extends RutaException {
  constructor(mensaje?: string) {
    super(mensaje || 'Los datos de la ruta son inválidos. Verifica frecuencia, bus, fecha y horario', 'RUTA_INVALID');
  }
}

export class RutaNoModificableException extends RutaException {
  constructor(id: number, estado: string) {
    super(`La ruta ${id} no puede modificarse en su estado actual: ${estado}`, 'RUTA_NOT_MODIFIABLE');
  }
}

export class RutaEstadoInvalidoException extends RutaException {
  constructor(mensaje: string) {
    super(mensaje, 'RUTA_ESTADO_INVALIDO');
  }
}

export class FechaRutaInvalidaException extends RutaException {
  constructor(mensaje: string = 'La fecha proporcionada para la ruta diaria no es válida.') {
    super(mensaje, 'FECHA_RUTA_INVALIDA');
  }
}

export class FrecuenciaNoDisponibleParaRutaException extends RutaException {
  constructor(frecuenciaId: number | string, mensaje?: string) {
    super(
      mensaje || `La frecuencia con ID ${frecuenciaId} no existe o no se encuentra activa.`,
      'FRECUENCIA_NO_DISPONIBLE'
    );
  }
}

export class FrecuenciaFueraDeDiaException extends RutaException {
  constructor(nombreDia: string, diasPermitidos: string[]) {
    super(
      `Esta frecuencia no opera los días ${nombreDia}. Días permitidos: ${diasPermitidos.join(', ')}`,
      'FRECUENCIA_FUERA_DE_DIA'
    );
  }
}

export class BusNoDisponibleParaRutaException extends RutaException {
  constructor(busId: number | string, fecha?: string, detalle?: string) {
    super(
      detalle ||
        (fecha
          ? `El bus con ID ${busId} ya se encuentra asignado a una ruta activa en el mismo horario para la fecha ${fecha}.`
          : `El bus con ID ${busId} no se encuentra disponible para operar.`),
      'BUS_NO_DISPONIBLE'
    );
  }
}

export class BusNoActivoParaRutaException extends RutaException {
  constructor(busId: number | string, mensaje?: string) {
    super(
      mensaje || `El bus con ID ${busId} no existe o no está en estado Activo.`,
      'BUS_NO_ACTIVO'
    );
  }
}

export class RutaSolapadaException extends RutaException {
  constructor(busId: number | string, mensaje?: string) {
    super(
      mensaje || `El bus ${busId} ya tiene un trayecto que se solapa con este horario.`,
      'RUTA_SOLAPADA'
    );
  }
}

export class BoletoNoValidoParaRutaException extends RutaException {
  constructor(mensaje: string = 'Boleto no encontrado o inválido para esta ruta.') {
    super(mensaje, 'BOLETO_INVALIDO_PARA_RUTA');
  }
}

