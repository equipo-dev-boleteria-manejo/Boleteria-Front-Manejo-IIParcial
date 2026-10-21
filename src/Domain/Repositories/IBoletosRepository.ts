/**
 * IBoletosRepository.ts - Contrato de Dominio para el Repositorio de Boletos
 */

import { Boleto } from '../Entities/Boleto';
import { EstadoBoleto, TipoPasajero } from '../Constants/EstadosSistema';

export interface BoletoPayload {
  VentaId: number;
  RutaId?: number;
  AsientoId: number;
  NombresPasajero: string;
  ApellidosPasajero: string;
  CedulaPasajero: string;
  FechaNacimiento?: string;
  EsMenor?: boolean;
  EsDiscapacitado?: boolean;
  EsTerceraEdad?: boolean;
  TipoPasajero?: TipoPasajero | string;
  DescuentoAplicado?: number;
  PrecioFinal: number;
  CodigoQr?: string;
  CodigoBarras?: string;
  Estado?: EstadoBoleto | string;
  SubRutaOrigen?: string;
  SubRutaDestino?: string;
  CreatedAt?: string;
}

export interface IBoletosRepository {
  insertarBoletos(boletos: Boleto[] | BoletoPayload[]): Promise<Boleto[]>;
  actualizarEstadoPorVenta(ventaId: number, estado: EstadoBoleto | string): Promise<void>;
  obtenerBoletosPorVenta(ventaId: number): Promise<Boleto[]>;
  obtenerBoletosPorRuta(rutaId: number): Promise<Boleto[]>;
  obtenerBoletosPorUsuario(cedula: string): Promise<Boleto[]>;
  verificarAsientoDisponible(rutaId: number, asientoId: number): Promise<boolean>;
  obtenerAsientosDisponiblesPorRuta(rutaId: number): Promise<any[]>;
  obtenerAsientosOcupadosPorRuta(rutaId: number): Promise<number[]>;
  obtenerBoletoPorId(id: number): Promise<Boleto | null>;
}
