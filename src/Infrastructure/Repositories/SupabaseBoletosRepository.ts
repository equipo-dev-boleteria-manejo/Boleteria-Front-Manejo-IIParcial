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
import type { IAbordajeBoletosRepository } from '../../Domain/Repositories/IAbordajeBoletosRepository';
import { BoletoNoValidoParaRutaException } from '../../Domain/Exceptions/RutaException';
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
  FechaNacimiento: string | null;
  EsMenor: boolean | null;
  EsDiscapacitado: boolean | null;
  EsTerceraEdad: boolean | null;
  DescuentoAplicado: number | null;
  SubRutaOrigen: string | null;
  SubRutaDestino: string | null;
  CreatedAt: string | null;
}

export class SupabaseBoletosRepository
  implements IBoletosRepository, ITicketRepository, IAbordajeBoletosRepository
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
        FechaNacimiento: esEntidad
          ? (item.fechaNacimiento ?? null)
          : (item.FechaNacimiento ?? null),
        EsMenor: esEntidad ? (item.esMenor ?? false) : (item.EsMenor ?? false),
        EsDiscapacitado: esEntidad
          ? (item.esDiscapacitado ?? false)
          : (item.EsDiscapacitado ?? false),
        EsTerceraEdad: esEntidad
          ? (item.esTerceraEdad ?? false)
          : (item.EsTerceraEdad ?? false),
        DescuentoAplicado: esEntidad
          ? (item.descuentoAplicado ?? 0)
          : (item.DescuentoAplicado ?? 0),
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
      // 23505 = unique_violation. El índice parcial impide que dos boletos
      // activos ocupen el mismo asiento en la misma ruta.
      const mensaje =
        error.code === '23505'
          ? 'Uno de los asientos ya fue ocupado por otra compra. Vuelve a buscar la ruta.'
          : `Error al insertar boletos en base de datos: ${error.message}`;
      throw new BoletoException(mensaje);
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
    const valor = cedula.trim();

    // 1. Boletos donde la persona figura directamente como pasajero
    const { data: boletosPorPasajero, error: errorPasajero } = await supabase
      .from(this.TABLA_BOLETOS)
      .select('*')
      .eq('CedulaPasajero', valor)
      .order('CreatedAt', { ascending: false });

    if (errorPasajero) {
      throw new BoletoException(
        `Error al obtener boletos para la cédula ${cedula}: ${errorPasajero.message}`,
      );
    }

    const mapa = new Map<number, BoletoRow>();
    ((boletosPorPasajero ?? []) as BoletoRow[]).forEach((row) => {
      mapa.set(row.Id, row);
    });

    // 2. Boletos comprados por el usuario como titular (Ventas.UsuarioVendedorId)
    let usuarioId: string | null = null;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)) {
      usuarioId = valor;
    } else {
      const { data: usuario } = await supabase
        .from('Usuarios')
        .select('Id')
        .eq('Cedula', valor)
        .maybeSingle();
      if (usuario?.Id) {
        usuarioId = String(usuario.Id);
      }
    }

    if (usuarioId) {
      const { data: ventas } = await supabase
        .from('Ventas')
        .select('Id')
        .eq('UsuarioVendedorId', usuarioId);

      const ventaIds = (ventas ?? []).map((v) => v.Id).filter(Boolean);
      if (ventaIds.length > 0) {
        const { data: boletosPorVenta } = await supabase
          .from(this.TABLA_BOLETOS)
          .select('*')
          .in('VentaId', ventaIds)
          .order('CreatedAt', { ascending: false });

        ((boletosPorVenta ?? []) as BoletoRow[]).forEach((row) => {
          mapa.set(row.Id, row);
        });
      }
    }

    const lista = Array.from(mapa.values()).sort((a, b) => {
      const fechaA = a.CreatedAt ? new Date(a.CreatedAt).getTime() : 0;
      const fechaB = b.CreatedAt ? new Date(b.CreatedAt).getTime() : 0;
      return fechaB - fechaA;
    });

    return lista.map((row) => this.mapRowToEntity(row));
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

  /**
   * Busca por código QR y, si no hay coincidencia, por código de barras. Se consultan por separado
   * (y no con .or()) para que un código con comas o paréntesis no altere el filtro de PostgREST.
   */
  async obtenerPorCodigo(codigo: string): Promise<Boleto | null> {
    const codigoLimpio = (codigo ?? '').trim();
    if (!codigoLimpio) return null;

    for (const columna of ['CodigoQr', 'CodigoBarras'] as const) {
      const { data, error } = await supabase
        .from(this.TABLA_BOLETOS)
        .select('*')
        .eq(columna, codigoLimpio)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new BoletoException(`Error al buscar el boleto por código: ${error.message}`);
      }
      if (data) return this.mapRowToEntity(data as BoletoRow);
    }

    return null;
  }

  /**
   * Actualización atómica: solo pasa a Abordado si el boleto sigue Emitido o Aprobado. Si otro dispositivo
   * lo validó un instante antes, no se actualiza ninguna fila y el abordaje se rechaza.
   */
  async marcarAbordado(id: number): Promise<void> {
    const { data, error } = await supabase
      .from(this.TABLA_BOLETOS)
      .update({ Estado: EstadoBoleto.ABORDADO })
      .eq('Id', id)
      .in('Estado', [EstadoBoleto.EMITIDO, EstadoBoleto.APROBADO])
      .select('Id');

    if (error) {
      throw new BoletoException(`Error al registrar el abordaje del boleto ${id}: ${error.message}`);
    }
    if (!data || data.length === 0) {
      throw new BoletoNoValidoParaRutaException('El boleto ya fue utilizado o no está habilitado para abordar.');
    }
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
    boleto.fechaNacimiento = row.FechaNacimiento;
    boleto.esMenor = row.EsMenor ?? false;
    boleto.esDiscapacitado = row.EsDiscapacitado ?? false;
    boleto.esTerceraEdad = row.EsTerceraEdad ?? false;
    boleto.descuentoAplicado = Number(row.DescuentoAplicado ?? 0);
    boleto.subRutaOrigen = row.SubRutaOrigen;
    boleto.subRutaDestino = row.SubRutaDestino;
    if (row.CreatedAt) {
      boleto.createdAt = new Date(row.CreatedAt);
    }
    return boleto;
  }
}
