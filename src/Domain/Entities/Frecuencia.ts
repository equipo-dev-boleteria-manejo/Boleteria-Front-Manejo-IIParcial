/**
 * Frecuencia.ts - Entidad de dominio para Frecuencias y Paradas Intermedias
 *
 * Una frecuencia es una ruta aprobada oficialmente (ANT) para una cooperativa:
 * origen, destino, hora de salida y días de operación. Puede tener paradas
 * intermedias donde se permite (o no) la venta de pasajes.
 */

export const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
  "Domingo",
] as const;

export type DiaOperacion = (typeof DIAS_SEMANA)[number];

const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const normalizarCiudad = (ciudad: string): string =>
  ciudad.trim().toLowerCase();

export class ParadaIntermedia {
  public id?: number;
  public frecuenciaId?: number;

  constructor(
    public ciudad: string,
    public orden: number,
    public minutosDesdeOrigen: number,
    public permiteVenta: boolean = true,
    public costoProporcional: number = 0,
  ) {}

  esValida(): boolean {
    return (
      this.ciudad.trim().length > 0 &&
      Number.isInteger(this.orden) &&
      this.orden > 0 &&
      Number.isInteger(this.minutosDesdeOrigen) &&
      this.minutosDesdeOrigen >= 0 &&
      this.costoProporcional >= 0
    );
  }
}

export class Frecuencia {
  public id?: number;
  public codigoAnt?: string;
  public resolucionAnt?: string;
  public createdAt?: Date;
  public paradas: ParadaIntermedia[] = [];

  constructor(
    public cooperativaId: number,
    public ciudadOrigen: string,
    public ciudadDestino: string,
    public horaSalida: string,
    public identificadorFrecuencia: string,
    public esDirecto: boolean = true,
    public diasOperacion: DiaOperacion[] = [...DIAS_SEMANA],
    public activa: boolean = true,
  ) {}

  esValida(): boolean {
    return (
      this.cooperativaId > 0 &&
      this.ciudadOrigen.trim().length > 0 &&
      this.ciudadDestino.trim().length > 0 &&
      normalizarCiudad(this.ciudadOrigen) !==
        normalizarCiudad(this.ciudadDestino) &&
      FORMATO_HORA.test(this.horaSalida) &&
      this.identificadorFrecuencia.trim().length > 0 &&
      this.diasOperacion.length > 0 &&
      this.diasOperacion.every((dia) => DIAS_SEMANA.includes(dia)) &&
      this.paradasSonValidas()
    );
  }

  /**
   * Las paradas deben ser válidas, con orden único y con tiempos que no
   * retrocedan a medida que avanza el orden. Ninguna puede ser el origen
   * ni el destino de la frecuencia.
   */
  paradasSonValidas(): boolean {
    const ordenadas = this.obtenerParadasOrdenadas();
    const extremos = [
      normalizarCiudad(this.ciudadOrigen),
      normalizarCiudad(this.ciudadDestino),
    ];

    return ordenadas.every((parada, indice) => {
      if (!parada.esValida()) return false;
      if (extremos.includes(normalizarCiudad(parada.ciudad))) return false;
      if (indice === 0) return true;

      const anterior = ordenadas[indice - 1];
      return (
        parada.orden !== anterior.orden &&
        parada.minutosDesdeOrigen >= anterior.minutosDesdeOrigen
      );
    });
  }

  opera(dia: DiaOperacion): boolean {
    return this.activa && this.diasOperacion.includes(dia);
  }

  obtenerParadasOrdenadas(): ParadaIntermedia[] {
    return [...this.paradas].sort((a, b) => a.orden - b.orden);
  }

  obtenerParadasConVenta(): ParadaIntermedia[] {
    return this.obtenerParadasOrdenadas().filter(
      (parada) => parada.permiteVenta,
    );
  }

  agregarParada(parada: ParadaIntermedia): void {
    this.paradas.push(parada);
  }

  /**
   * Indica si la frecuencia sirve el tramo origen -> destino, ya sea el
   * recorrido completo o un sub-tramo entre paradas. Las paradas
   * intermedias solo cuentan si permiten venta.
   */
  cubreTramo(origen: string, destino: string): boolean {
    const desde = normalizarCiudad(origen);
    const hasta = normalizarCiudad(destino);
    if (desde === hasta) return false;

    const tramo: { ciudad: string; vendible: boolean }[] = [
      { ciudad: normalizarCiudad(this.ciudadOrigen), vendible: true },
      ...this.obtenerParadasOrdenadas().map((parada) => ({
        ciudad: normalizarCiudad(parada.ciudad),
        vendible: parada.permiteVenta,
      })),
      { ciudad: normalizarCiudad(this.ciudadDestino), vendible: true },
    ];

    const indiceDesde = tramo.findIndex(
      (punto) => punto.ciudad === desde && punto.vendible,
    );
    const indiceHasta = tramo.findIndex(
      (punto) => punto.ciudad === hasta && punto.vendible,
    );

    return indiceDesde !== -1 && indiceHasta !== -1 && indiceDesde < indiceHasta;
  }

  desactivar(): void {
    this.activa = false;
  }

  activar(): void {
    this.activa = true;
  }
}
