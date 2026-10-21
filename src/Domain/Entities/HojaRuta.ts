/**
 * HojaRuta.ts - Entidad de Dominio: El Reporte Diario del Supervisor
 *
 * Representa la bitácora administrativa de control diario de operaciones de la cooperativa
 * para una fecha determinada.
 */

import { EstadoHojaRuta } from '../Constants/EstadosSistema';
import { HojaRutaYaCerradaException } from '../Exceptions/HojaRutaException';

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class HojaRuta {
  public id?: number;
  public usuarioCreadorId?: string;
  public tipoGeneracion: string = 'Manual';
  public observaciones?: string;
  public createdAt?: Date;

  constructor(
    public fecha: string,
    public estado: EstadoHojaRuta = EstadoHojaRuta.BORRADOR,
  ) {}

  esValida(): boolean {
    return Boolean(this.fecha && FORMATO_FECHA.test(this.fecha.trim()));
  }

  emitir(): void {
    if (this.estado === EstadoHojaRuta.CERRADA && this.id) {
      throw new HojaRutaYaCerradaException(this.id);
    }
    this.estado = EstadoHojaRuta.EMITIDA;
  }

  cerrar(): void {
    this.estado = EstadoHojaRuta.CERRADA;
  }

  estaAbierta(): boolean {
    return this.estado === EstadoHojaRuta.BORRADOR || this.estado === EstadoHojaRuta.EMITIDA;
  }
}
