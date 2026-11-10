/**
 * Ruta.ts - Entidad de Dominio: La Orden de Despacho (Viaje Operativo)
 *
 * Representa la asignación operativa de recursos (Bus, Chofer, Frecuencia y Hoja de Ruta)
 * para realizar un viaje concreto en una fecha y horario específico.
 */

import { EstadoRuta } from '../Constants/EstadosSistema';
import { RutaNoModificableException } from '../Exceptions/RutaException';

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class Ruta {
  public id?: number;
  public choferId?: string;
  public hojaRutaId?: number;
  public horaSalida?: string;
  public horaLlegada?: string;
  public esDirecta: boolean = true;
  public observacionChofer?: string;
  public tiempoViajeMinutos?: number;
  public createdAt?: Date;

  constructor(
    public frecuenciaId: number,
    public busId: number,
    public fecha: string,
    public estado: EstadoRuta = EstadoRuta.PROGRAMADA,
  ) {}

  esValida(): boolean {
    return (
      Number.isInteger(this.frecuenciaId) &&
      this.frecuenciaId > 0 &&
      Number.isInteger(this.busId) &&
      this.busId > 0 &&
      Boolean(this.fecha && FORMATO_FECHA.test(this.fecha.trim()))
    );
  }

  iniciarViaje(): void {
    if (this.estado !== EstadoRuta.PROGRAMADA && this.id) {
      throw new RutaNoModificableException(this.id, this.estado);
    }
    this.estado = EstadoRuta.EN_CURSO;
  }

  finalizarViaje(): void {
    if (this.estado !== EstadoRuta.EN_CURSO && this.id) {
      throw new RutaNoModificableException(this.id, this.estado);
    }
    this.estado = EstadoRuta.FINALIZADA;
  }

  cancelarViaje(motivo?: string): void {
    if (this.estado === EstadoRuta.FINALIZADA && this.id) {
      throw new RutaNoModificableException(this.id, this.estado);
    }
    this.estado = EstadoRuta.CANCELADA;
    if (motivo) {
      this.observacionChofer = this.observacionChofer
        ? `${this.observacionChofer} | Cancelado: ${motivo}`
        : `Cancelado: ${motivo}`;
    }
  }

  puedeModificarse(): boolean {
    return this.estado === EstadoRuta.PROGRAMADA;
  }
}
