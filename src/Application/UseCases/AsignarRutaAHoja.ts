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
import {
  FrecuenciaNoDisponibleParaRutaException,
  BusNoActivoParaRutaException,
  ChoferNoDisponibleParaRutaException,
  RutaSolapadaException,
} from '../../Domain/Exceptions/RutaException';
import { HojaRutaYaCerradaException } from '../../Domain/Exceptions/HojaRutaException';
import { buscarConflictoHorario, crearIntervalo } from '../../Domain/Rules/solapamientoRutas';
import { cargarRutasAdyacentes } from '../Services/ocupacionRutas';
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
      throw new FrecuenciaNoDisponibleParaRutaException(
        frecuenciaId,
        'Frecuencia no encontrada o inactiva.'
      );
    }

    // 2. Si se inyectó el repositorio de buses, validar que el bus exista y esté Activo.
    // Los mensajes nombran el bus como lo ve el usuario (número y placa) y no por su id interno.
    let nombreBus = `bus ${busId}`;
    if (this.busRepo) {
      const bus = await this.busRepo.obtenerPorId(busId);
      if (bus) nombreBus = `bus #${bus.numero} (${bus.placa})`;

      if (!bus || bus.estado !== EstadoBus.ACTIVO) {
        throw new BusNoActivoParaRutaException(
          busId,
          bus
            ? `El ${nombreBus} no está en estado Activo.`
            : `El bus con ID ${busId} no existe o no está en estado Activo.`
        );
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
      throw new HojaRutaYaCerradaException(hojaRuta.id ?? 0);
    }

    // 4. Validar solapamiento de horarios (misma regla que "Programar ruta"): el bus no puede tener dos viajes a la
    //    vez, ni el chofer, si se indicó. Se miran también el día anterior y el siguiente (viajes de medianoche).
    const horaSalidaFinal = horaSalida || frecuencia.horaSalida || '08:00';
    const intervaloNuevo = crearIntervalo(horaSalidaFinal, horaLlegada);

    // Si la hoja ya trae sus rutas se usan para el propio día; si no, se consultan al repositorio.
    const rutasHojaDelBus =
      hojaRuta.rutas && Array.isArray(hojaRuta.rutas)
        ? hojaRuta.rutas.filter((r: Ruta) => r.busId === busId)
        : undefined;
    const rutasDelBus = await cargarRutasAdyacentes(
      fecha,
      (dia) => this.rutaRepo.obtenerPorBusYFecha(busId, dia),
      rutasHojaDelBus,
    );

    if (buscarConflictoHorario(intervaloNuevo, rutasDelBus)) {
      throw new RutaSolapadaException(
        busId,
        `El ${nombreBus} ya tiene un trayecto que se solapa con este horario.`
      );
    }

    if (choferId) {
      const rutasDelChofer = await cargarRutasAdyacentes(fecha, (dia) =>
        this.rutaRepo.obtenerPorChoferYFecha(choferId, dia),
      );
      if (buscarConflictoHorario(intervaloNuevo, rutasDelChofer)) {
        throw new ChoferNoDisponibleParaRutaException();
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

    const rutaGuardada = await this.rutaRepo.crear(nuevaRuta);

    return {
      success: true,
      ruta: rutaGuardada,
      hojaRuta,
    };
  }

  async execute(input: AsignarRutaAHojaInput): Promise<AsignarRutaAHojaOutput> {
    return this.ejecutar(input);
  }

}

export const asignarRutaAHojaUseCase = new AsignarRutaAHoja(
  new SupabaseHojaRutaRepository(),
  new SupabaseRutaRepository(),
  new SupabaseFrecuenciaRepository(),
  new SupabaseBusRepository(),
);
