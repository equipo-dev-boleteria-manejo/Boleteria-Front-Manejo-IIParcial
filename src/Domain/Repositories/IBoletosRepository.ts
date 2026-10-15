export interface IBoletosRepository {
  insertarBoletos(boletos: BoletoPayload[]): Promise<any[]>
  actualizarEstadoPorVenta(ventaId: number, estado: string): Promise<void>
  obtenerBoletosPorVenta(ventaId: number): Promise<any[]>
  verificarAsientoDisponible(rutaId: number, asientoId: number): Promise<boolean>
  obtenerAsientosDisponiblesPorRuta(rutaId: number): Promise<any[]>
}

export interface BoletoPayload {
  VentaId: number
  AsientoId: number
  NombresPasajero: string
  ApellidosPasajero: string
  CedulaPasajero: string
  FechaNacimiento: string
  EsMenor: boolean
  EsDiscapacitado: boolean
  EsTerceraEdad: boolean
  DescuentoAplicado: number
  PrecioFinal: number
  CodigoQr: string
  CodigoBarras: string
  Estado: string
  CreatedAt: string
}