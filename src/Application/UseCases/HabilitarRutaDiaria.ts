/**
 * HabilitarRutaDiaria.ts - Caso de Uso para Habilitar una Ruta Diaria
 *
 * Arquitectura:
 * - Inversión de Dependencias (DIP): Recibe IRutaRepository, IBusRepository e IFrecuenciaRepository por constructor.
 * - Cero acoplamiento a Vue, DOM o Supabase directo.
 * - Validación de entradas y manejo de excepciones canónicas de dominio.
 */

import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import type { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoBus, EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import {
  FechaRutaInvalidaException,
  FrecuenciaNoDisponibleParaRutaException,
  FrecuenciaFueraDeDiaException,
  BusNoDisponibleParaRutaException,
  BusNoActivoParaRutaException,
  ChoferNoDisponibleParaRutaException,
} from '../../Domain/Exceptions/RutaException';
import { buscarConflictoHorario, crearIntervalo, describirHorario } from '../../Domain/Rules/solapamientoRutas';
import { cargarRutasAdyacentes } from '../Services/ocupacionRutas';
import { SupabaseRutaRepository } from '../../Infrastructure/Repositories/SupabaseRutaRepository';
import { SupabaseBusRepository } from '../../Infrastructure/Repositories/SupabaseBusRepository';
import { SupabaseFrecuenciaRepository } from '../../Infrastructure/Repositories/SupabaseFrecuenciaRepository';

export interface HabilitarRutaInput {
  frecuenciaId: number;
  busId: number;
  fecha: string;
  choferId?: string;
  hojaRutaId?: number;
  horaSalida?: string;
  horaLlegada?: string;
  esDirecta?: boolean;
  observacionChofer?: string;
  tiempoViajeMinutos?: number;
}

export class HabilitarRutaDiaria {
  constructor(
    private readonly rutaRepo: IRutaRepository,
    private readonly busRepo: IBusRepository,
    private readonly frecuenciaRepo: IFrecuenciaRepository,
  ) {}

  async ejecutar(input: HabilitarRutaInput): Promise<Ruta> {
    const { frecuenciaId, busId, fecha } = input;

    // 1. Validar fecha
    if (!fecha || Number.isNaN(Date.parse(fecha)) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha.trim())) {
      throw new FechaRutaInvalidaException('La fecha proporcionada para la ruta diaria no es válida.');
    }

    // 2. Validar frecuencia existente y activa
    const frecuenciaExistente = await this.frecuenciaRepo.obtenerPorId(frecuenciaId);
    if (!frecuenciaExistente || !frecuenciaExistente.activa) {
      throw new FrecuenciaNoDisponibleParaRutaException(
        frecuenciaId,
        `La frecuencia con ID ${frecuenciaId} no existe o no se encuentra activa.`
      );
    }

    // 3. Validar día de operación de la frecuencia
    this.validarDiaSemana(fecha, frecuenciaExistente.diasOperacion as string[]);

    // 4. Validar bus existente y en estado Activo
    const busExistente = await this.busRepo.obtenerPorId(busId);
    if (!busExistente || busExistente.estado !== EstadoBus.ACTIVO) {
      throw new BusNoActivoParaRutaException(
        busId,
        busExistente
          ? `El bus #${busExistente.numero} (${busExistente.placa}) no está en estado Activo.`
          : `El bus con ID ${busId} no existe o no está en estado Activo.`
      );
    }

    // 5. Validar disponibilidad del bus: puede hacer varios viajes el mismo día siempre que no se solapen
    //    (misma regla que "Vincular al plan"). Se miran también el día anterior y el siguiente, por los viajes
    //    que cruzan la medianoche. Un viaje del mismo día sin hora conocida se asume ocupado.
    const horaSalida = input.horaSalida || frecuenciaExistente.horaSalida;
    const intervaloNuevo = crearIntervalo(horaSalida, input.horaLlegada, input.tiempoViajeMinutos);

    const rutasDelBus = await cargarRutasAdyacentes(fecha, (dia) => this.rutaRepo.obtenerPorBusYFecha(busId, dia));
    const conflictoBus = buscarConflictoHorario(intervaloNuevo, rutasDelBus, { sinHoraOcupa: true });

    if (conflictoBus) {
      const horario = describirHorario(conflictoBus, fecha);
      throw new BusNoDisponibleParaRutaException(
        busId,
        fecha,
        `El bus #${busExistente.numero} (${busExistente.placa}) ya se encuentra asignado a una ruta activa en el mismo horario para la fecha ${fecha}${horario ? ` (${horario})` : ''}.`
      );
    }

    // 5b. Un chofer no puede manejar dos viajes a la vez (aunque sean de buses distintos).
    if (input.choferId) {
      const choferId = input.choferId;
      const rutasDelChofer = await cargarRutasAdyacentes(fecha, (dia) =>
        this.rutaRepo.obtenerPorChoferYFecha(choferId, dia),
      );
      const conflictoChofer = buscarConflictoHorario(intervaloNuevo, rutasDelChofer);

      if (conflictoChofer) {
        const horario = describirHorario(conflictoChofer, fecha);
        throw new ChoferNoDisponibleParaRutaException(
          `El chofer seleccionado ya tiene asignado otro viaje que se solapa con este horario${horario ? ` (${horario})` : ''}.`,
        );
      }
    }

    // 6. Instanciar la nueva Ruta con estado Programada por defecto
    const nuevaRuta = new Ruta(
      frecuenciaId,
      busId,
      fecha,
      EstadoRuta.PROGRAMADA,
    );

    nuevaRuta.choferId = input.choferId;
    nuevaRuta.hojaRutaId = input.hojaRutaId;
    nuevaRuta.horaSalida = horaSalida;
    nuevaRuta.horaLlegada = input.horaLlegada;
    nuevaRuta.esDirecta = input.esDirecta ?? frecuenciaExistente.esDirecto;
    nuevaRuta.observacionChofer = input.observacionChofer;
    nuevaRuta.tiempoViajeMinutos = input.tiempoViajeMinutos;

    return await this.rutaRepo.crear(nuevaRuta);
  }

  async execute(input: HabilitarRutaInput): Promise<Ruta> {
    return this.ejecutar(input);
  }

  private validarDiaSemana(fechaStr: string, diasOperacion?: string[]): void {
    if (!diasOperacion || diasOperacion.length === 0) return;

    const fecha = new Date(`${fechaStr}T00:00:00`);
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const nombreDia = diasSemana[fecha.getDay()];

    const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const diaBuscado = normalizar(nombreDia);

    const coincide = diasOperacion.some((d) => normalizar(d) === diaBuscado);

    if (!coincide) {
      throw new FrecuenciaFueraDeDiaException(nombreDia, diasOperacion);
    }
  }
}

export const habilitarRutaDiariaUseCase = new HabilitarRutaDiaria(
  new SupabaseRutaRepository(),
  new SupabaseBusRepository(),
  new SupabaseFrecuenciaRepository(),
);
