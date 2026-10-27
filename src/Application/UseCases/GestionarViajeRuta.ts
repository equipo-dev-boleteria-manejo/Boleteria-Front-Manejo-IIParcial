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
} from '../../Domain/Exceptions/RutaException';
import { SupabaseRutaRepository } from '../../Infrastructure/Repositories/SupabaseRutaRepository';

export class GestionarViajeRuta {
  constructor(private readonly rutaRepo: IRutaRepository) {}

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
