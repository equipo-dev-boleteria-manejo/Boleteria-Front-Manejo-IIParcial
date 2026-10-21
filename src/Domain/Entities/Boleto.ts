/**
 * Boleto.ts - Entidad de Dominio: Pasaje Emitido
 *
 * Representa el boleto de viaje asignado a un pasajero para un asiento específico
 * en una ruta operativa determinada, con sus códigos de validación y tarifas aplicadas.
 */

import { EstadoBoleto, TipoPasajero } from '../Constants/EstadosSistema';
import { BoletoNoModificableException } from '../Exceptions/BoletoException';

const FORMATO_CEDULA = /^\d{10}$/;

export class Boleto {
  public id?: number;
  public codigoQr?: string | null;
  public codigoBarras?: string | null;
  public subRutaOrigen?: string | null;
  public subRutaDestino?: string | null;
  public createdAt?: Date;

  constructor(
    public ventaId: number,
    public rutaId: number,
    public asientoId: number,
    public cedulaPasajero: string,
    public nombresPasajero: string,
    public apellidosPasajero: string,
    public precioFinal: number,
    public tipoPasajero: TipoPasajero = TipoPasajero.GENERAL,
    public estado: EstadoBoleto = EstadoBoleto.RESERVADO,
  ) {}

  esValida(): boolean {
    const cedula = this.cedulaPasajero?.trim();
    const nombres = this.nombresPasajero?.trim();
    const apellidos = this.apellidosPasajero?.trim();

    return (
      Number.isInteger(this.ventaId) &&
      this.ventaId > 0 &&
      Number.isInteger(this.rutaId) &&
      this.rutaId > 0 &&
      Number.isInteger(this.asientoId) &&
      this.asientoId > 0 &&
      Boolean(cedula && FORMATO_CEDULA.test(cedula)) &&
      Boolean(nombres && nombres.length > 0) &&
      Boolean(apellidos && apellidos.length > 0) &&
      Number.isFinite(this.precioFinal) &&
      this.precioFinal >= 0 &&
      Object.values(TipoPasajero).includes(this.tipoPasajero) &&
      Object.values(EstadoBoleto).includes(this.estado)
    );
  }

  emitir(codigoQr?: string, codigoBarras?: string): void {
    if (this.estado === EstadoBoleto.CANCELADO) {
      throw new BoletoNoModificableException(this.id ?? 0, this.estado);
    }
    this.estado = EstadoBoleto.EMITIDO;
    if (codigoQr) this.codigoQr = codigoQr;
    if (codigoBarras) this.codigoBarras = codigoBarras;
  }

  registrarAbordaje(): void {
    if (
      this.estado !== EstadoBoleto.EMITIDO &&
      this.estado !== EstadoBoleto.APROBADO
    ) {
      throw new BoletoNoModificableException(this.id ?? 0, this.estado);
    }
    this.estado = EstadoBoleto.ABORDADO;
  }

  registrarNoAbordo(): void {
    if (
      this.estado !== EstadoBoleto.EMITIDO &&
      this.estado !== EstadoBoleto.APROBADO
    ) {
      throw new BoletoNoModificableException(this.id ?? 0, this.estado);
    }
    this.estado = EstadoBoleto.NO_ABORDO;
  }

  cancelar(): void {
    if (
      this.estado === EstadoBoleto.CANCELADO ||
      this.estado === EstadoBoleto.ABORDADO
    ) {
      throw new BoletoNoModificableException(this.id ?? 0, this.estado);
    }
    this.estado = EstadoBoleto.CANCELADO;
  }

  puedeModificarse(): boolean {
    return (
      this.estado === EstadoBoleto.RESERVADO ||
      this.estado === EstadoBoleto.PROCESO_VALIDACION
    );
  }
}
