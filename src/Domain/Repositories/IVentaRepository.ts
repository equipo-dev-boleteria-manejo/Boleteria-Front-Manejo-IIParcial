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
  /** Identificador del PaymentIntent de Stripe para compras con tarjeta. */
  StripePaymentIntentId?: string | null;
  AprobadoPorId?: string | null;
  FechaVenta?: string;
}

export interface IVentaRepository {
  crearVenta(venta: Venta | VentaPayload): Promise<number>;
  cancelarVenta(ventaId: number): Promise<void>;
  obtenerVentaPorId(ventaId: number): Promise<Venta | null>;
  obtenerVentasPendientes(): Promise<Venta[]>;
  obtenerVentasPorRuta(rutaId: number): Promise<Venta[]>;
  aprobarVenta(ventaId: number, aprobadoPorId: string | null): Promise<void>;
  /**
   * Confirma una reserva pagada con tarjeta: guarda el PaymentIntent, marca la
   * venta como aprobada y deja constancia del usuario que la confirma.
   */
  confirmarVentaTarjeta(
    ventaId: number,
    stripePaymentIntentId: string,
    aprobadoPorId?: string | null,
  ): Promise<void>;
  rechazarVenta(ventaId: number, aprobadoPorId: string, observacion?: string): Promise<void>;
  migrarVentasARuta(oldRutaId: number, newRutaId: number): Promise<void>;
  uploadComprobante?(
    path: string,
    file: Blob | ArrayBuffer | Uint8Array,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<{ publicUrl: string }>;
}
