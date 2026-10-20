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
