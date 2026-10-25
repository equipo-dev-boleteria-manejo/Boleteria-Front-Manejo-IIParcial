/**
 * AsignarBusAFrecuencia.ts - Caso de Uso: asignar un bus a una frecuencia en una fecha
 *
 * En el esquema la asignación bus-frecuencia vive en la tabla "Rutas" (orden de despacho
 * de un viaje concreto), por eso el resultado es una Ruta programada.
 *
 * Reglas de negocio:
 * - La frecuencia existe, está activa y opera el día de la semana de la fecha.
 * - El bus existe, pertenece a la cooperativa de la frecuencia y está 'Activo'.
 * - Los intervalos horarios del bus en esa fecha no se cruzan con otro viaje no cancelado.
 *
 * Arquitectura:
 * - Inversión de Dependencias (DIP): recibe los tres repositorios por constructor.
 * - Cero acoplamiento a Vue, DOM o Supabase directo.
 */

import { DIAS_SEMANA, type DiaOperacion, type Frecuencia } from '../../Domain/Entities/Frecuencia';
import { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import type { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import { BusNoActivoException, BusNoEncontradoException } from '../../Domain/Exceptions/BusException';
import {
  AsignacionBusInvalidaException,
  BusNoPerteneceACooperativaException,
  ConflictoHorarioBusException,
  FrecuenciaInactivaException,
  FrecuenciaNoEncontradaException,
  FrecuenciaNoOperaEnFechaException,
} from '../../Domain/Exceptions/FrecuenciaException';
import { SupabaseBusRepository } from '../../Infrastructure/Repositories/SupabaseBusRepository';
import { SupabaseFrecuenciaRepository } from '../../Infrastructure/Repositories/SupabaseFrecuenciaRepository';
import { SupabaseRutaRepository } from '../../Infrastructure/Repositories/SupabaseRutaRepository';
import type { AsignarBusAFrecuenciaDto } from '../Dtos/AsignarBusAFrecuenciaDto';

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MINUTOS_POR_DIA = 24 * 60;

interface Intervalo {
  inicio: number;
  fin: number;
}

/** Convierte 'HH:mm' o 'HH:mm:ss' a minutos desde la medianoche. */
function horaAMinutos(hora: string): number {
  const [horas, minutos] = hora.split(':');
  return Number(horas) * 60 + Number(minutos);
}

/** Dos intervalos se cruzan si comparten al menos un minuto (los extremos cuentan). */
function seCruzan(a: Intervalo, b: Intervalo): boolean {
  return a.inicio <= b.fin && b.inicio <= a.fin;
}

export class AsignarBusAFrecuenciaUseCase {
  constructor(
    private readonly frecuenciaRepo: IFrecuenciaRepository,
    private readonly busRepo: IBusRepository,
    private readonly rutaRepo: IRutaRepository,
  ) {}

  /**
   * Valida las reglas de asignación y registra la Ruta programada del bus.
   */
  async execute(dto: AsignarBusAFrecuenciaDto): Promise<Ruta> {
    const fecha = dto.fecha?.trim();
    this.validarEntrada(dto, fecha);

    const frecuencia = await this.frecuenciaRepo.obtenerPorId(dto.frecuenciaId);
    if (!frecuencia) throw new FrecuenciaNoEncontradaException(dto.frecuenciaId);
    if (!frecuencia.activa) throw new FrecuenciaInactivaException(dto.frecuenciaId);

    const dia = this.diaDeLaSemana(fecha);
    if (!frecuencia.opera(dia)) {
      throw new FrecuenciaNoOperaEnFechaException(dto.frecuenciaId, fecha, dia);
    }

    const bus = await this.busRepo.obtenerPorId(dto.busId);
    if (!bus) throw new BusNoEncontradoException(dto.busId);
    if (bus.cooperativaId !== frecuencia.cooperativaId) {
      throw new BusNoPerteneceACooperativaException(dto.busId, frecuencia.cooperativaId);
    }
    if (!bus.estaDisponibleParaOperar()) {
      throw new BusNoActivoException(dto.busId, bus.estado);
    }

    if (await this.tieneConflictoHorario(frecuencia, dto.busId, fecha)) {
      throw new ConflictoHorarioBusException(dto.busId, fecha, frecuencia.horaSalida);
    }

    const ruta = new Ruta(dto.frecuenciaId, dto.busId, fecha);
    ruta.horaSalida = frecuencia.horaSalida;
    ruta.esDirecta = frecuencia.esDirecto;
    return await this.rutaRepo.crear(ruta);
  }

  /** Alias en español para mantener compatibilidad con las convenciones del equipo. */
  async ejecutar(dto: AsignarBusAFrecuenciaDto): Promise<Ruta> {
    return this.execute(dto);
  }

  private validarEntrada(dto: AsignarBusAFrecuenciaDto, fecha: string | undefined): void {
    if (!Number.isInteger(dto.frecuenciaId) || dto.frecuenciaId <= 0) {
      throw new AsignacionBusInvalidaException('La frecuencia es requerida para asignar un bus');
    }
    if (!Number.isInteger(dto.busId) || dto.busId <= 0) {
      throw new AsignacionBusInvalidaException('El bus es requerido para asignarlo a una frecuencia');
    }
    if (!fecha || !FORMATO_FECHA.test(fecha) || !this.esFechaReal(fecha)) {
      throw new AsignacionBusInvalidaException('La fecha debe existir y tener el formato YYYY-MM-DD');
    }
  }

  private esFechaReal(fecha: string): boolean {
    const date = new Date(`${fecha}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(fecha);
  }

  /** getUTCDay() empieza en domingo (0); DIAS_SEMANA empieza en lunes. */
  private diaDeLaSemana(fecha: string): DiaOperacion {
    const indiceUtc = new Date(`${fecha}T00:00:00Z`).getUTCDay();
    return DIAS_SEMANA[(indiceUtc + 6) % 7];
  }

  private async tieneConflictoHorario(frecuencia: Frecuencia, busId: number, fecha: string): Promise<boolean> {
    const rutas = await this.rutaRepo.obtenerPorBusYFecha(busId, fecha);
    const vigentes = rutas.filter((ruta) => ruta.estado !== EstadoRuta.CANCELADA);
    if (vigentes.length === 0) return false;

    const nuevo = this.intervaloDeFrecuencia(frecuencia);
    const frecuenciasConsultadas = new Map<number, Frecuencia | null>();

    for (const ruta of vigentes) {
      if (!frecuenciasConsultadas.has(ruta.frecuenciaId)) {
        frecuenciasConsultadas.set(ruta.frecuenciaId, await this.frecuenciaRepo.obtenerPorId(ruta.frecuenciaId));
      }
      const existente = this.intervaloDeRuta(ruta, frecuenciasConsultadas.get(ruta.frecuenciaId) ?? null);
      if (existente && seCruzan(nuevo, existente)) return true;
    }
    return false;
  }

  private intervaloDeFrecuencia(frecuencia: Frecuencia): Intervalo {
    const inicio = horaAMinutos(frecuencia.horaSalida);
    return { inicio, fin: inicio + frecuencia.duracionMinimaMinutos() };
  }

  /**
   * Usa la hora de llegada de la ruta si existe; si no, su tiempo de viaje o, en
   * último caso, la duración mínima conocida de su frecuencia.
   */
  private intervaloDeRuta(ruta: Ruta, frecuencia: Frecuencia | null): Intervalo | null {
    const horaSalida = ruta.horaSalida ?? frecuencia?.horaSalida;
    if (!horaSalida) return null;

    const inicio = horaAMinutos(horaSalida);
    if (ruta.horaLlegada) {
      let fin = horaAMinutos(ruta.horaLlegada);
      if (fin < inicio) fin += MINUTOS_POR_DIA;
      return { inicio, fin };
    }

    const duracion = ruta.tiempoViajeMinutos ?? frecuencia?.duracionMinimaMinutos() ?? 0;
    return { inicio, fin: inicio + duracion };
  }
}

// Instancia por defecto lista para ser consumida en la capa de presentación
export const asignarBusAFrecuenciaUseCase = new AsignarBusAFrecuenciaUseCase(
  new SupabaseFrecuenciaRepository(),
  new SupabaseBusRepository(),
  new SupabaseRutaRepository(),
);
