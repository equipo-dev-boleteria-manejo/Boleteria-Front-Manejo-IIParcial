/**
 * IVentaRepository.ts - Contrato de Dominio para el Repositorio de Ventas
 */

import { Venta } from '../Entities/Venta';
import { EstadoVenta, MetodoPago } from '../Constants/EstadosSistema';

export interface VentaPayload {
  UsuarioVendedorId?: string | null;
  RutaId: number;
  CiudadOrigenVenta: string;
  CiudadDestinoVenta: string;
  Total: number;
  Estado?: EstadoVenta | string;
  MetodoPago: MetodoPago | string;
  ComprobanteUrl?: string | null;
  AprobadoPorId?: string | null;
  FechaVenta?: string;
}

export interface IVentaRepository {
  crearVenta(venta: Venta | VentaPayload): Promise<number>;
  cancelarVenta(ventaId: number): Promise<void>;
  obtenerVentaPorId(ventaId: number): Promise<Venta | null>;
  obtenerVentasPendientes(): Promise<Venta[]>;
  obtenerVentasPorRuta(rutaId: number): Promise<Venta[]>;
  aprobarVenta(ventaId: number, aprobadoPorId: string): Promise<void>;
  rechazarVenta(ventaId: number, aprobadoPorId: string, observacion?: string): Promise<void>;
  migrarVentasARuta(oldRutaId: number, newRutaId: number): Promise<void>;
  uploadComprobante?(path: string, file: Blob | ArrayBuffer | any, options?: any): Promise<{ publicUrl: string }>;
}
