/**
 * Constantes y tipos de estados oficiales del sistema definidos en el contrato de dominio.
 * Centraliza los valores válidos para evitar cadenas mágicas dispersas y desacoplar componentes.
 */

export const EstadoCooperativa = {
  ACTIVA: 'Activa',
  INACTIVA: 'Inactiva',
} as const
export type EstadoCooperativa = (typeof EstadoCooperativa)[keyof typeof EstadoCooperativa]

export const EstadoBus = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
  FUERA_DE_SERVICIO: 'FueraDeServicio',
  MANTENIMIENTO: 'Mantenimiento',
} as const
export type EstadoBus = (typeof EstadoBus)[keyof typeof EstadoBus]

export const EstadoHojaRuta = {
  BORRADOR: 'Borrador',
  EMITIDA: 'Emitida',
  CERRADA: 'Cerrada',
} as const
export type EstadoHojaRuta = (typeof EstadoHojaRuta)[keyof typeof EstadoHojaRuta]

export const EstadoRuta = {
  PROGRAMADA: 'Programada',
  EN_CURSO: 'EnCurso',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
} as const
export type EstadoRuta = (typeof EstadoRuta)[keyof typeof EstadoRuta]

export const EstadoVenta = {
  PENDIENTE: 'Pendiente',
  APROBADA_PAGO: 'AprobadaPago',
  CANCELADA: 'Cancelada',
} as const
export type EstadoVenta = (typeof EstadoVenta)[keyof typeof EstadoVenta]

export const EstadoBoleto = {
  RESERVADO: 'Reservado',
  PROCESO_VALIDACION: 'Proceso de validacion',
  APROBADO: 'Aprobado',
  EMITIDO: 'Emitido',
  CANCELADO: 'Cancelado',
  ABORDADO: 'Abordado',
  NO_ABORDO: 'NoAbordo',
} as const
export type EstadoBoleto = (typeof EstadoBoleto)[keyof typeof EstadoBoleto]

export const MetodoPago = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  DEPOSITO: 'Deposito',
} as const
export type MetodoPago = (typeof MetodoPago)[keyof typeof MetodoPago]

export const TipoPasajero = {
  GENERAL: 'General',
  TERCERA_EDAD: 'TerceraEdad',
  DISCAPACITADO: 'Discapacitado',
  MENOR_EDAD: 'MenorEdad',
} as const
export type TipoPasajero = (typeof TipoPasajero)[keyof typeof TipoPasajero]

export const RolUsuario = {
  ADMIN: 'admin',
  ENCARGADO: 'encargado',
  OFICINISTA: 'oficinista',
  CHOFER: 'chofer',
  CLIENTE: 'cliente',
} as const
export type RolUsuario = (typeof RolUsuario)[keyof typeof RolUsuario]

export const EstadoCambio = {
  SOLICITADO: 'Solicitado',
  EN_EVALUACION: 'EnEvaluacion',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  EN_DESARROLLO: 'EnDesarrollo',
  IMPLEMENTADO: 'Implementado',
} as const
export type EstadoCambio = (typeof EstadoCambio)[keyof typeof EstadoCambio]

export const TipoCambio = {
  NORMAL: 'Normal',
  ESTANDAR: 'Estandar',
  EMERGENCIA: 'Emergencia',
} as const
export type TipoCambio = (typeof TipoCambio)[keyof typeof TipoCambio]

export const PrioridadCambio = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  CRITICA: 'Critica',
} as const
export type PrioridadCambio = (typeof PrioridadCambio)[keyof typeof PrioridadCambio]


export const DESCUENTO_MENOR = 0.3;
export const DESCUENTO_DISCAPACIDAD = 0.5;
export const DESCUENTO_TERCERA_EDAD = 0.5;

export type CalculoDescuento = {
  esMenor: boolean;
  esDiscapacitado: boolean;
  esTerceraEdad: boolean;
  descuentoAplicado: number;
  precioFinal: number;
};

export function calcularEdad(fechaNacimiento: string): number {
  const fecha = new Date(fechaNacimiento);
  if (Number.isNaN(fecha.getTime())) return -1;
  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getFullYear();
  const m = hoy.getMonth() - fecha.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) edad--;
  return edad;
}

export function calcularDescuentoBoleto(
  fechaNacimiento: string,
  tieneDiscapacidad: boolean,
  precioBase: number,
): CalculoDescuento {
  const edad = calcularEdad(fechaNacimiento);
  const esMenor = edad >= 0 && edad < 18;
  const esTerceraEdad = edad >= 65;
  const esDiscapacitado = !!tieneDiscapacidad;

  const candidatos: number[] = [0];
  if (esMenor) candidatos.push(DESCUENTO_MENOR);
  if (esDiscapacitado) candidatos.push(DESCUENTO_DISCAPACIDAD);
  if (esTerceraEdad) candidatos.push(DESCUENTO_TERCERA_EDAD);

  const descuentoAplicado = Math.max(...candidatos);
  const precioFinal = Number((precioBase * (1 - descuentoAplicado)).toFixed(2));
  return { esMenor, esDiscapacitado, esTerceraEdad, descuentoAplicado, precioFinal };
}
