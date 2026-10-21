/**
 * SupabaseBoletosRepository.ts - Implementación de IBoletosRepository e ITicketRepository con Supabase
 * Alineado estrictamente con la tabla "Boletos" del esquema oficial.
 */

import { supabase } from '../Api/supabaseClient';
import { Boleto } from '../../Domain/Entities/Boleto';
import { EstadoBoleto, TipoPasajero } from '../../Domain/Constants/EstadosSistema';
import type {
  IBoletosRepository,
  BoletoPayload,
} from '../../Domain/Repositories/IBoletosRepository';
import type { ITicketRepository } from '../../Domain/Repositories/ITicketRepository';
import {
  BoletoException,
  BoletoInvalidoException,
} from '../../Domain/Exceptions/BoletoException';

interface BoletoRow {
  Id: number;
  VentaId: number;
  RutaId: number;
  AsientoId: number;
  CedulaPasajero: string;
  NombresPasajero: string;
  ApellidosPasajero: string;
  TipoPasajero: string;
  Estado: string;
  CodigoQr: string | null;
  CodigoBarras: string | null;
  PrecioFinal: number;
  SubRutaOrigen: string | null;
  SubRutaDestino: string | null;
  CreatedAt: string | null;
}

export class SupabaseBoletosRepository
  implements IBoletosRepository, ITicketRepository
{
  private readonly TABLA_BOLETOS = 'Boletos';

  async insertarBoletos(
    boletos: Boleto[] | BoletoPayload[],
  ): Promise<Boleto[]> {
    if (!boletos || boletos.length === 0) return [];

    const rows = boletos.map((item) => {
      const esEntidad = item instanceof Boleto;

      if (esEntidad && !item.esValida()) {
        throw new BoletoInvalidoException(
          `Boleto inválido para el pasajero ${item.nombresPasajero} ${item.apellidosPasajero}`,
        );
      }

      return {
        VentaId: esEntidad ? item.ventaId : item.VentaId,
        RutaId: esEntidad ? item.rutaId : (item.RutaId ?? 0),
        AsientoId: esEntidad ? item.asientoId : item.AsientoId,
        CedulaPasajero: esEntidad ? item.cedulaPasajero : item.CedulaPasajero,
        NombresPasajero: esEntidad ? item.nombresPasajero : item.NombresPasajero,
        ApellidosPasajero: esEntidad
          ? item.apellidosPasajero
          : item.ApellidosPasajero,
        TipoPasajero: esEntidad
          ? item.tipoPasajero
          : (item.TipoPasajero ?? TipoPasajero.GENERAL),
        Estado: esEntidad
          ? item.estado
          : (item.Estado ?? EstadoBoleto.RESERVADO),
        CodigoQr: esEntidad ? (item.codigoQr ?? null) : (item.CodigoQr ?? null),
        CodigoBarras: esEntidad
          ? (item.codigoBarras ?? null)
          : (item.CodigoBarras ?? null),
        PrecioFinal: esEntidad ? item.precioFinal : item.PrecioFinal,
        SubRutaOrigen: esEntidad
          ? (item.subRutaOrigen ?? null)
          : (item.SubRutaOrigen ?? null),
        SubRutaDestino: esEntidad
          ? (item.subRutaDestino ?? null)
          : (item.SubRutaDestino ?? null),
      };
    });

    const { data, error } = await supabase
      .from(this.TABLA_BOLETOS)
      .insert(rows)
      .select('*');

    if (error) {
      throw new BoletoException(
        `Error al insertar boletos en base de datos: ${error.message}`,
      );
    }

    return (data as BoletoRow[]).map((row) => this.mapRowToEntity(row));
  }

  async actualizarEstadoPorVenta(
    ventaId: number,
    estado: EstadoBoleto | string,
  ): Promise<void> {
    const { error } = await supabase
      .from(this.TABLA_BOLETOS)
      .update({ Estado: estado })
      .eq('VentaId', ventaId);

    if (error) {
      throw new BoletoException(
        `Error al actualizar estado de boletos para la venta ${ventaId}: ${error.message}`,
      );
    }
  }

  async obtenerBoletosPorVenta(ventaId: number): Promise<Boleto[]> {
    const { data, error } = await supabase
      .from(this.TABLA_BOLETOS)
      .select('*')
      .eq('VentaId', ventaId)
      .order('Id', { ascending: true });

    if (error) {
      throw new BoletoException(
        `Error al obtener boletos de la venta ${ventaId}: ${error.message}`,
      );
    }

    return (data as BoletoRow[]).map((row) => this.mapRowToEntity(row));
  }

  async obtenerBoletosPorRuta(rutaId: number): Promise<Boleto[]> {
    const { data, error } = await supabase
      .from(this.TABLA_BOLETOS)
      .select('*')
      .eq('RutaId', rutaId)
      .order('AsientoId', { ascending: true });

    if (error) {
      throw new BoletoException(
        `Error al obtener boletos de la ruta ${rutaId}: ${error.message}`,
      );
    }

    return (data as BoletoRow[]).map((row) => this.mapRowToEntity(row));
  }

  async obtenerBoletosPorUsuario(cedula: string): Promise<Boleto[]> {
    const { data, error } = await supabase
      .from(this.TABLA_BOLETOS)
      .select('*')
      .eq('CedulaPasajero', cedula.trim())
      .order('CreatedAt', { ascending: false });

    if (error) {
      throw new BoletoException(
        `Error al obtener boletos para la cédula ${cedula}: ${error.message}`,
      );
    }

    return (data as BoletoRow[]).map((row) => this.mapRowToEntity(row));
  }

  async verificarAsientoDisponible(
    rutaId: number,
    asientoId: number,
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from(this.TABLA_BOLETOS)
      .select('Id')
      .eq('RutaId', rutaId)
      .eq('AsientoId', asientoId)
      .neq('Estado', EstadoBoleto.CANCELADO);

    if (error) {
      throw new BoletoException(
        `Error al verificar disponibilidad de asiento ${asientoId}: ${error.message}`,
      );
    }

    return !data || data.length === 0;
  }

  async obtenerAsientosOcupadosPorRuta(rutaId: number): Promise<number[]> {
    const { data, error } = await supabase
      .from(this.TABLA_BOLETOS)
      .select('AsientoId')
      .eq('RutaId', rutaId)
      .neq('Estado', EstadoBoleto.CANCELADO);

    if (error) {
      throw new BoletoException(
        `Error al obtener asientos ocupados de la ruta ${rutaId}: ${error.message}`,
      );
    }

    const set = new Set<number>();
    (data as { AsientoId: number }[]).forEach((item) => set.add(item.AsientoId));
    return Array.from(set);
  }

  async obtenerAsientosDisponiblesPorRuta(rutaId: number): Promise<any[]> {
    const ocupados = await this.obtenerAsientosOcupadosPorRuta(rutaId);
    return ocupados;
  }

  async obtenerBoletoPorId(id: number): Promise<Boleto | null> {
    const { data, error } = await supabase
      .from(this.TABLA_BOLETOS)
      .select('*')
      .eq('Id', id)
      .maybeSingle();

    if (error) {
      throw new BoletoException(
        `Error al consultar boleto ${id}: ${error.message}`,
      );
    }

    if (!data) return null;
    return this.mapRowToEntity(data as BoletoRow);
  }

  private mapRowToEntity(row: BoletoRow): Boleto {
    const boleto = new Boleto(
      row.VentaId,
      row.RutaId,
      row.AsientoId,
      row.CedulaPasajero,
      row.NombresPasajero,
      row.ApellidosPasajero,
      Number(row.PrecioFinal),
      row.TipoPasajero as TipoPasajero,
      row.Estado as EstadoBoleto,
    );
    boleto.id = row.Id;
    boleto.codigoQr = row.CodigoQr;
    boleto.codigoBarras = row.CodigoBarras;
    boleto.subRutaOrigen = row.SubRutaOrigen;
    boleto.subRutaDestino = row.SubRutaDestino;
    if (row.CreatedAt) {
      boleto.createdAt = new Date(row.CreatedAt);
    }
    return boleto;
  }
}
