/**
 * AsignarRutaAHoja.ts - Caso de Uso para Asignar una Ruta Operativa a una Hoja de Ruta
 *
 * Arquitectura:
 * - Inversión de Dependencias (DIP): Recibe repositorios por constructor.
 * - Validación de coherencia operativa: bus activo, frecuencia activa y control de solapamiento horario.
 * - Cero acoplamiento a frameworks de UI.
 */

import type { IHojaRutaRepository } from '../../Domain/Repositories/IHojaRutaRepository';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import type { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import { HojaRuta } from '../../Domain/Entities/HojaRuta';
import { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoBus, EstadoHojaRuta, EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import { SupabaseHojaRutaRepository } from '../../Infrastructure/Repositories/SupabaseHojaRutaRepository';
import { SupabaseRutaRepository } from '../../Infrastructure/Repositories/SupabaseRutaRepository';
import { SupabaseFrecuenciaRepository } from '../../Infrastructure/Repositories/SupabaseFrecuenciaRepository';
import { SupabaseBusRepository } from '../../Infrastructure/Repositories/SupabaseBusRepository';

export interface AsignarRutaAHojaInput {
  busId: number;
  frecuenciaId: number;
  fecha: string;
  usuarioCreadorId?: string;
  choferId?: string;
  horaSalida?: string;
  horaLlegada?: string;
}

export interface AsignarRutaAHojaOutput {
  success: boolean;
  error?: string;
  ruta?: Ruta;
  hojaRuta?: HojaRuta;
}

export class AsignarRutaAHoja {
  constructor(
    private readonly hojaRutaRepo: IHojaRutaRepository,
    private readonly rutaRepo: IRutaRepository,
    private readonly frecuenciaRepo: IFrecuenciaRepository,
    private readonly busRepo?: IBusRepository,
  ) {}

  async ejecutar(input: AsignarRutaAHojaInput): Promise<AsignarRutaAHojaOutput> {
    const { busId, frecuenciaId, fecha, usuarioCreadorId, choferId, horaSalida, horaLlegada } = input;

    // 1. Validar frecuencia activa
    const frecuencia = await this.frecuenciaRepo.obtenerPorId(frecuenciaId);
    if (!frecuencia || !frecuencia.activa) {
      return { success: false, error: 'Frecuencia no encontrada o inactiva.' };
    }

    // 2. Si se inyectó el repositorio de buses, validar que el bus exista y esté Activo
    if (this.busRepo) {
      const bus = await this.busRepo.obtenerPorId(busId);
      if (!bus || bus.estado !== EstadoBus.ACTIVO) {
        return { success: false, error: `El bus con ID ${busId} no existe o no está en estado Activo.` };
      }
    }

    // 3. Obtener o crear la hoja de ruta para la fecha especificada
    const resHoja = await this.hojaRutaRepo.obtenerPorFecha(fecha);
    let hojaRuta: HojaRuta | null = Array.isArray(resHoja)
      ? (resHoja.length > 0 ? resHoja[0] : null)
      : resHoja;

    if (!hojaRuta) {
      const nuevaHoja = new HojaRuta(fecha, EstadoHojaRuta.BORRADOR);
      nuevaHoja.usuarioCreadorId = usuarioCreadorId;
      nuevaHoja.tipoGeneracion = 'Manual';
      hojaRuta = await this.hojaRutaRepo.crear(nuevaHoja);
    } else if (hojaRuta.estado === EstadoHojaRuta.CERRADA) {
      return { success: false, error: 'La hoja de ruta para esta fecha ya se encuentra cerrada.' };
    }

    // 4. Validar solapamiento de horarios para este bus
    const DURACION_ESTIMADA_MS = 3 * 60 * 60 * 1000;
    const horaSalidaFinal = horaSalida || frecuencia.horaSalida || '08:00';
    const nuevaHoraInicio = this.parseHora(horaSalidaFinal);
    const nuevaHoraFin = horaLlegada
      ? this.parseHora(horaLlegada)
      : nuevaHoraInicio + DURACION_ESTIMADA_MS;

    // Obtener rutas del bus para verificar solapamientos
    let rutasDelBus: Ruta[] = [];
    if ((hojaRuta as any).rutas && Array.isArray((hojaRuta as any).rutas)) {
      rutasDelBus = (hojaRuta as any).rutas.filter((r: Ruta) => r.busId === busId);
    } else {
      const rutasExistentes = await this.rutaRepo.obtenerPorBusYFecha(busId, fecha);
      rutasDelBus = rutasExistentes || [];
    }

    for (const rutaExistente of rutasDelBus) {
      if (rutaExistente.estado === EstadoRuta.CANCELADA) continue;
      if (!rutaExistente.horaSalida) continue;

      const existenteInicio = this.parseHora(rutaExistente.horaSalida);
      const existenteFin = rutaExistente.horaLlegada
        ? this.parseHora(rutaExistente.horaLlegada)
        : existenteInicio + DURACION_ESTIMADA_MS;

      const seSolapa =
        (nuevaHoraInicio >= existenteInicio && nuevaHoraInicio < existenteFin) ||
        (nuevaHoraFin > existenteInicio && nuevaHoraFin <= existenteFin) ||
        (nuevaHoraInicio <= existenteInicio && nuevaHoraFin >= existenteFin);

      if (seSolapa) {
        return {
          success: false,
          error: `El bus ${busId} ya tiene un trayecto que se solapa con este horario.`,
        };
      }
    }

    // 5. Crear la nueva ruta operativa asignada a la hoja
    const nuevaRuta = new Ruta(
      frecuenciaId,
      busId,
      fecha,
      EstadoRuta.PROGRAMADA,
    );
    nuevaRuta.hojaRutaId = hojaRuta.id;
    nuevaRuta.horaSalida = horaSalidaFinal;
    nuevaRuta.horaLlegada = horaLlegada;
    nuevaRuta.esDirecta = frecuencia.esDirecto;
    nuevaRuta.choferId = choferId;

    let rutaGuardada: Ruta;
    if (typeof (this.rutaRepo as any).crearRuta === 'function') {
      rutaGuardada = await (this.rutaRepo as any).crearRuta(nuevaRuta);
    } else {
      rutaGuardada = await this.rutaRepo.crear(nuevaRuta);
    }

    return {
      success: true,
      ruta: rutaGuardada,
      hojaRuta,
    };
  }

  async execute(input: AsignarRutaAHojaInput): Promise<AsignarRutaAHojaOutput> {
    return this.ejecutar(input);
  }

  private parseHora(horaStr: string): number {
    const partes = horaStr.split(':').map(Number);
    const horas = partes[0] || 0;
    const minutos = partes[1] || 0;
    return horas * 60 * 60 * 1000 + minutos * 60 * 1000;
  }
}

export const asignarRutaAHojaUseCase = new AsignarRutaAHoja(
  new SupabaseHojaRutaRepository(),
  new SupabaseRutaRepository(),
  new SupabaseFrecuenciaRepository(),
  new SupabaseBusRepository(),
);
