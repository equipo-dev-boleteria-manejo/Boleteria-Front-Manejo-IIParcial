export interface SeatTypeResponseDTO {
  id: number | string;
  nombre: string;
  colorHex: string;
  precioBase: number;
  descripcion: string;
  estado: boolean;
}

export interface CalcularTarifaInputDTO {
  seatTypeId?: number | string;
  precioBase?: number;
  porcentajeDescuento?: number;
}

export interface ValidarAsignacionInputDTO {
  rutaTipoDirecta: boolean;
  paradaDestinoId: number | string;
  terminalDestinoId: number | string;
}