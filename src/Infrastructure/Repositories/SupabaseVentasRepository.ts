/**
 * SupabaseVentasRepository.ts - Implementación de IVentaRepository con Supabase
 * Alineado estrictamente con la tabla "Ventas" del esquema oficial.
 */

import { supabase } from '../Api/supabaseClient';
import { Venta } from '../../Domain/Entities/Venta';
import { EstadoVenta, MetodoPago } from '../../Domain/Constants/EstadosSistema';
import type {
  IVentaRepository,
  VentaPayload,
} from '../../Domain/Repositories/IVentaRepository';
import {
  VentaException,
  VentaNoEncontradaException,
  VentaInvalidaException,
} from '../../Domain/Exceptions/VentaException';

interface VentaRow {
  Id: number;
  UsuarioVendedorId: string | null;
  RutaId: number;
  CiudadOrigenVenta: string;
  CiudadDestinoVenta: string;
  Total: number;
  Estado: string;
  MetodoPago: string;
  ComprobanteUrl: string | null;
  AprobadoPorId: string | null;
  FechaVenta: string | null;
}

export class SupabaseVentasRepository implements IVentaRepository {
  private readonly TABLA_VENTAS = 'Ventas';
  private readonly BUCKET_COMPROBANTES = 'comprobantes';

  async crearVenta(venta: Venta | VentaPayload): Promise<number> {
    const esEntidad = venta instanceof Venta;

    if (esEntidad && !venta.esValida()) {
      throw new VentaInvalidaException('La venta a registrar contiene datos inválidos.');
    }

    const payload = {
      UsuarioVendedorId: esEntidad
        ? (venta.usuarioVendedorId ?? null)
        : (venta.UsuarioVendedorId ?? null),
      RutaId: esEntidad ? venta.rutaId : venta.RutaId,
      CiudadOrigenVenta: esEntidad
        ? venta.ciudadOrigenVenta
        : venta.CiudadOrigenVenta,
      CiudadDestinoVenta: esEntidad
        ? venta.ciudadDestinoVenta
        : venta.CiudadDestinoVenta,
      Total: esEntidad ? venta.total : venta.Total,
      Estado: esEntidad ? venta.estado : (venta.Estado ?? EstadoVenta.PENDIENTE),
      MetodoPago: esEntidad ? venta.metodoPago : venta.MetodoPago,
      ComprobanteUrl: esEntidad
        ? (venta.comprobanteUrl ?? null)
        : (venta.ComprobanteUrl ?? null),
      AprobadoPorId: esEntidad
        ? (venta.aprobadoPorId ?? null)
        : (venta.AprobadoPorId ?? null),
    };

    const { data, error } = await supabase
      .from(this.TABLA_VENTAS)
      .insert(payload)
      .select('Id')
      .single();

    if (error) {
      throw new VentaException(`Error al crear la venta en base de datos: ${error.message}`);
    }

    return (data as { Id: number }).Id;
  }

  async cancelarVenta(ventaId: number): Promise<void> {
    const { error } = await supabase
      .from(this.TABLA_VENTAS)
      .update({ Estado: EstadoVenta.CANCELADA })
      .eq('Id', ventaId);

    if (error) {
      throw new VentaException(`Error al cancelar la venta ${ventaId}: ${error.message}`);
    }
  }

  async obtenerVentaPorId(ventaId: number): Promise<Venta | null> {
    const { data, error } = await supabase
      .from(this.TABLA_VENTAS)
      .select('*')
      .eq('Id', ventaId)
      .maybeSingle();

    if (error) {
      throw new VentaException(`Error al consultar la venta ${ventaId}: ${error.message}`);
    }

    if (!data) return null;
    return this.mapRowToEntity(data as VentaRow);
  }

  async obtenerVentasPendientes(): Promise<Venta[]> {
    const { data, error } = await supabase
      .from(this.TABLA_VENTAS)
      .select('*')
      .eq('Estado', EstadoVenta.PENDIENTE)
      .order('FechaVenta', { ascending: false });

    if (error) {
      throw new VentaException(`Error al listar ventas pendientes: ${error.message}`);
    }

    return (data as VentaRow[]).map((row) => this.mapRowToEntity(row));
  }

  async obtenerVentasPorRuta(rutaId: number): Promise<Venta[]> {
    const { data, error } = await supabase
      .from(this.TABLA_VENTAS)
      .select('*')
      .eq('RutaId', rutaId)
      .order('FechaVenta', { ascending: false });

    if (error) {
      throw new VentaException(`Error al listar ventas de la ruta ${rutaId}: ${error.message}`);
    }

    return (data as VentaRow[]).map((row) => this.mapRowToEntity(row));
  }

  async aprobarVenta(ventaId: number, aprobadoPorId: string): Promise<void> {
    const { error } = await supabase
      .from(this.TABLA_VENTAS)
      .update({
        Estado: EstadoVenta.APROBADA_PAGO,
        AprobadoPorId: aprobadoPorId,
      })
      .eq('Id', ventaId);

    if (error) {
      throw new VentaException(`Error al aprobar la venta ${ventaId}: ${error.message}`);
    }
  }

  async rechazarVenta(
    ventaId: number,
    aprobadoPorId: string,
    _observacion?: string,
  ): Promise<void> {
    const { error } = await supabase
      .from(this.TABLA_VENTAS)
      .update({
        Estado: EstadoVenta.CANCELADA,
        AprobadoPorId: aprobadoPorId,
      })
      .eq('Id', ventaId);

    if (error) {
      throw new VentaException(`Error al rechazar la venta ${ventaId}: ${error.message}`);
    }
  }

  async migrarVentasARuta(oldRutaId: number, newRutaId: number): Promise<void> {
    const { error } = await supabase
      .from(this.TABLA_VENTAS)
      .update({ RutaId: newRutaId })
      .eq('RutaId', oldRutaId);

    if (error) {
      throw new VentaException(
        `Error al migrar ventas de la ruta ${oldRutaId} a ${newRutaId}: ${error.message}`,
      );
    }
  }

  async uploadComprobante(
    path: string,
    file: Blob | ArrayBuffer | any,
    options?: any,
  ): Promise<{ publicUrl: string }> {
    const { error: uploadError } = await supabase.storage
      .from(this.BUCKET_COMPROBANTES)
      .upload(path, file, options);

    if (uploadError) {
      throw new VentaException(`Error al subir comprobante: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from(this.BUCKET_COMPROBANTES)
      .getPublicUrl(path);

    return { publicUrl: data.publicUrl };
  }

  private mapRowToEntity(row: VentaRow): Venta {
    const venta = new Venta(
      row.RutaId,
      row.CiudadOrigenVenta,
      row.CiudadDestinoVenta,
      Number(row.Total),
      row.Estado as EstadoVenta,
      row.MetodoPago as MetodoPago,
    );
    venta.id = row.Id;
    venta.usuarioVendedorId = row.UsuarioVendedorId;
    venta.comprobanteUrl = row.ComprobanteUrl;
    venta.aprobadoPorId = row.AprobadoPorId;
    if (row.FechaVenta) {
      venta.fechaVenta = new Date(row.FechaVenta);
    }
    return venta;
  }
}
