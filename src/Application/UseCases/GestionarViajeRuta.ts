/**
 * GestionarViajeRuta.ts - Caso de Uso para el Ciclo de Vida y Transiciones de Viajes Operativos
 *
 * Arquitectura:
 * - Capa de Aplicación: Centraliza las reglas de negocio y transiciones de estado de las rutas.
 * - Desacopla la lógica de negocio de los composables (useRutas y useChoferRuta).
 * - Inversión de Dependencias (DIP): Inyecta IRutaRepository por constructor.
 */

import type { IRutaRepository, RutaFiltros } from '../../Domain/Repositories/IRutaRepository';
import type { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import {
  RutaInvalidaException,
  RutaEstadoInvalidoException,
  RutaFueraDeFechaException,
  ChoferNoDisponibleParaRutaException,
} from '../../Domain/Exceptions/RutaException';
import { buscarConflictoHorario, describirHorario, intervaloDeRuta } from '../../Domain/Rules/solapamientoRutas';
import { cargarRutasAdyacentes } from '../Services/ocupacionRutas';
import { SupabaseRutaRepository } from '../../Infrastructure/Repositories/SupabaseRutaRepository';
import { fechaLocalISO } from '../../utils/fechaLocal';

export class GestionarViajeRuta {
  constructor(
    private readonly rutaRepo: IRutaRepository,
    /** Fecha de hoy (YYYY-MM-DD); se inyecta para poder probar la regla sin depender del reloj. */
    private readonly hoy: () => string = () => fechaLocalISO(),
  ) {}

  /**
   * Obtiene la lista de rutas aplicando filtros opcionales.
   */
  async obtenerRutas(filtros?: RutaFiltros): Promise<Ruta[]> {
    return await this.rutaRepo.obtenerTodas(filtros);
  }

  /**
   * Cambia el estado de una ruta operativa.
   */
  async cambiarEstado(rutaId: number, nuevoEstado: EstadoRuta): Promise<Ruta> {
    return await this.rutaRepo.cambiarEstado(rutaId, nuevoEstado);
  }

  /**
   * Inicia el viaje operativo validando que se encuentre en estado Programada.
   */
  async iniciarViaje(rutaId: number): Promise<Ruta> {
    if (!rutaId) {
      throw new RutaInvalidaException('No hay una ruta asignada para iniciar.');
    }

    const ruta = await this.rutaRepo.obtenerPorId(rutaId);
    if (ruta && ruta.estado !== EstadoRuta.PROGRAMADA) {
      throw new RutaEstadoInvalidoException('Solo se puede iniciar un viaje en estado Programada.');
    }

    // Un viaje solo puede iniciarse el día para el que fue programado (o después, si quedó pendiente).
    if (ruta && ruta.fecha > this.hoy()) {
      throw new RutaFueraDeFechaException(ruta.fecha);
    }

    return await this.rutaRepo.cambiarEstado(rutaId, EstadoRuta.EN_CURSO);
  }

  /**
   * Finaliza el viaje operativo calculando la hora de llegada si no se proporciona.
   */
  async finalizarViaje(
    rutaId: number,
    observacion?: string,
    horaLlegada?: string,
  ): Promise<Ruta> {
    if (!rutaId) {
      throw new RutaInvalidaException('No hay una ruta asignada para finalizar.');
    }

    const ruta = await this.rutaRepo.obtenerPorId(rutaId);
    if (ruta && ruta.estado !== EstadoRuta.EN_CURSO) {
      throw new RutaEstadoInvalidoException('Solo se puede finalizar un viaje que esté en curso.');
    }

    let horaFinal = horaLlegada;
    if (!horaFinal) {
      const ahora = new Date();
      horaFinal = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    }

    const cambios: Partial<Ruta> = { horaLlegada: horaFinal };
    if (observacion) {
      cambios.observacionChofer = observacion;
    }

    await this.rutaRepo.actualizar(rutaId, cambios);
    return await this.rutaRepo.cambiarEstado(rutaId, EstadoRuta.FINALIZADA);
  }

  /**
   * Cancela el viaje operativo registrando el motivo en las observaciones.
   */
  async cancelarViaje(rutaId: number, motivo?: string): Promise<Ruta> {
    if (!rutaId) {
      throw new RutaInvalidaException('Identificador de ruta obligatorio para cancelar.');
    }

    if (motivo) {
      await this.rutaRepo.actualizar(rutaId, {
        observacionChofer: `Cancelado: ${motivo}`,
      });
    }

    return await this.rutaRepo.cambiarEstado(rutaId, EstadoRuta.CANCELADA);
  }

  /**
   * Asigna un chofer a la ruta.
   */
  async asignarChofer(rutaId: number, choferId: string): Promise<Ruta> {
    if (!rutaId || !choferId) {
      throw new RutaInvalidaException('Identificador de ruta y chofer requeridos.');
    }

    // Un chofer no puede manejar dos viajes a la vez: se compara con sus demás rutas (la propia no cuenta).
    const ruta = await this.rutaRepo.obtenerPorId(rutaId);
    const intervalo = ruta ? intervaloDeRuta(ruta) : null;
    if (ruta && intervalo) {
      const rutasDelChofer = await cargarRutasAdyacentes(ruta.fecha, (dia) =>
        this.rutaRepo.obtenerPorChoferYFecha(choferId, dia),
      );
      const conflicto = buscarConflictoHorario(intervalo, rutasDelChofer, { ignorarRutaId: ruta.id });

      if (conflicto) {
        const horario = describirHorario(conflicto, ruta.fecha);
        throw new ChoferNoDisponibleParaRutaException(
          `El chofer ya tiene asignado otro viaje que se solapa con este horario${horario ? ` (${horario})` : ''}.`,
        );
      }
    }

    return await this.rutaRepo.actualizar(rutaId, { choferId });
  }

  /**
   * Registra una novedad de emergencia en la bitácora de la ruta.
   */
  async registrarEmergencia(rutaId: number, observacion: string): Promise<Ruta> {
    if (!rutaId) {
      throw new RutaInvalidaException('No hay una ruta activa para registrar emergencia.');
    }

    if (!observacion || !observacion.trim()) {
      throw new RutaInvalidaException('Debe proporcionar un detalle de la emergencia.');
    }

    const ruta = await this.rutaRepo.obtenerPorId(rutaId);
    const obsActual = ruta?.observacionChofer;
    const nuevaObs = obsActual
      ? `${obsActual} | EMERGENCIA: ${observacion.trim()}`
      : `EMERGENCIA: ${observacion.trim()}`;

    return await this.rutaRepo.actualizar(rutaId, {
      observacionChofer: nuevaObs,
    });
  }

  /**
   * Elimina una ruta operativa.
   */
  async eliminarRuta(rutaId: number): Promise<void> {
    if (!rutaId) {
      throw new RutaInvalidaException('Identificador de ruta obligatorio para eliminar.');
    }

    await this.rutaRepo.eliminar(rutaId);
  }
}

export const gestionarViajeRutaUseCase = new GestionarViajeRuta(
  new SupabaseRutaRepository(),
);
