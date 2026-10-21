/**
 * Excepción base para todas las anomalías y violaciones de reglas en la capa de Dominio.
 * Provee identificación estandarizada y código de error opcional sin dependencias externas.
 */
export class DomainException extends Error {
  public readonly code: string

  constructor(message: string, code: string = 'DOMAIN_ERROR') {
    super(message)
    this.name = 'DomainException'
    this.code = code
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
