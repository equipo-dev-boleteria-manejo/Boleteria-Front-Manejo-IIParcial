export interface CalcularDescuentoVentaDto {
  numeroCedula: string;
  edad: number;
  tieneDiscapacidad: boolean;
  precioBase: number;
}

export interface ResultadoDescuentoVentaDto {
  numeroCedula: string;
  edad: number;
  tieneDiscapacidad: boolean;
  precioBase: number;
  categoria: 'SIN_DESCUENTO' | 'MENOR' | 'DISCAPACIDAD' | 'TERCERA_EDAD';
  porcentajeDescuento: number;
  montoDescuento: number;
  precioFinal: number;
}
