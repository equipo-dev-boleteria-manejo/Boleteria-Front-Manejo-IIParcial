/**
 * Asiento.ts - Entidad de Dominio: Asiento Físico de un Bus
 *
 * Representa una posición concreta dentro del mapa de un bus. La entidad es
 * independiente de la venta: la disponibilidad operativa se cruza con los
 * boletos emitidos para una ruta determinada.
 */

export class Asiento {
  public id?: number;

  constructor(
    public busId: number,
    public numeroAsiento: string,
    public tipo: string = 'Normal',
    public fila: string = '',
    public columna: string = '',
    public piso: number = 1,
    public disponible: boolean = true,
  ) {}

  esValido(): boolean {
    return (
      Number.isInteger(this.busId) &&
      this.busId > 0 &&
      Boolean(this.numeroAsiento?.trim()) &&
      Boolean(this.tipo?.trim()) &&
      Number.isInteger(this.piso) &&
      this.piso >= 1
    );
  }

  estaDisponible(): boolean {
    return this.disponible;
  }

  marcarNoDisponible(): void {
    this.disponible = false;
  }

  marcarDisponible(): void {
    this.disponible = true;
  }
}
