/**
 * GestionarHojaRuta.ts - Caso de Uso para la Administración Operativa de Hojas de Ruta
 *
 * Arquitectura:
 * - Inversión de Dependencias (DIP): Recibe IHojaRutaRepository, IFrecuenciaRepository y opcionalmente IRutaRepository por constructor.
 * - Cero llamadas SQL directas o imports de Supabase dentro del caso de uso.
 * - Validación canónica de estados y fechas.
 */

import type { IHojaRutaRepository } from '../../Domain/Repositories/IHojaRutaRepository';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import { HojaRuta } from '../../Domain/Entities/HojaRuta';
import type { Frecuencia } from '../../Domain/Entities/Frecuencia';
import { EstadoHojaRuta, EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import { FechaHojaRutaInvalidaException } from '../../Domain/Exceptions/HojaRutaException';
import { SupabaseHojaRutaRepository } from '../../Infrastructure/Repositories/SupabaseHojaRutaRepository';
import { SupabaseFrecuenciaRepository } from '../../Infrastructure/Repositories/SupabaseFrecuenciaRepository';
import { SupabaseRutaRepository } from '../../Infrastructure/Repositories/SupabaseRutaRepository';

export class GestionarHojaRuta {
  constructor(
    private readonly hojaRutaRepository: IHojaRutaRepository,
    private readonly frecuenciaRepository: IFrecuenciaRepository,
    private readonly rutaRepository?: IRutaRepository,
  ) {}

  /**
   * Lista las hojas de ruta existentes para una fecha dada.
   */
  async listarPorFecha(fecha: string): Promise<HojaRuta[]> {
    this.validarFecha(fecha);
    const resultado = await this.hojaRutaRepository.obtenerPorFecha(fecha);
    if (!resultado) return [];
    return Array.isArray(resultado) ? resultado : [resultado];
  }

  /**
   * Crea la hoja de ruta del día en estado Borrador si aún no existe.
   * Si ya existe, retorna la existente para evitar duplicaciones.
   */
  async crearHojaDia(fecha: string, usuarioCreadorId?: string): Promise<HojaRuta> {
    this.validarFecha(fecha);
    const existentes = await this.listarPorFecha(fecha);
    if (existentes.length > 0 && existentes[0]) {
      return existentes[0];
    }

    const nuevaHoja = new HojaRuta(fecha, EstadoHojaRuta.BORRADOR);
    nuevaHoja.usuarioCreadorId = usuarioCreadorId;
    nuevaHoja.tipoGeneracion = 'Manual';

    return await this.hojaRutaRepository.crear(nuevaHoja);
  }

  /**
   * Emite / inicia la hoja de ruta diaria.
   */
  async iniciarRuta(id: number): Promise<HojaRuta> {
    return await this.hojaRutaRepository.cambiarEstado(id, EstadoHojaRuta.EMITIDA);
  }

  /**
   * Cierra / finaliza la hoja de ruta y actualiza ordenadamente sus rutas asociadas.
   */
  async finalizarRuta(id: number): Promise<HojaRuta> {
    const hojaActualizada = await this.hojaRutaRepository.cambiarEstado(id, EstadoHojaRuta.CERRADA);

    // Si se cuenta con el repositorio de rutas, finalizar las rutas pendientes
    if (this.rutaRepository) {
      try {
        const rutas = await this.rutaRepository.obtenerPorHojaRuta(id);
        for (const ruta of rutas) {
          if (
            ruta.id &&
            (ruta.estado === EstadoRuta.PROGRAMADA || ruta.estado === EstadoRuta.EN_CURSO)
          ) {
            await this.rutaRepository.cambiarEstado(ruta.id, EstadoRuta.FINALIZADA);
          }
        }
      } catch (err) {
        console.warn(`No se pudieron actualizar rutas para hoja ${id}:`, err);
      }
    }

    return hojaActualizada;
  }

  /**
   * Cancela la hoja de ruta y sus viajes asociados que no se hayan completado.
   */
  async cancelarRuta(id: number, motivo?: string): Promise<HojaRuta> {
    const hojaActualizada = await this.hojaRutaRepository.cambiarEstado(id, EstadoHojaRuta.CERRADA);

    if (this.rutaRepository) {
      try {
        const rutas = await this.rutaRepository.obtenerPorHojaRuta(id);
        for (const ruta of rutas) {
          if (ruta.id && ruta.estado !== EstadoRuta.FINALIZADA) {
            await this.rutaRepository.cambiarEstado(ruta.id, EstadoRuta.CANCELADA);
            if (motivo) {
              await this.rutaRepository.actualizar(ruta.id, {
                observacionChofer: `Hoja cancelada: ${motivo}`,
              });
            }
          }
        }
      } catch (err) {
        console.warn(`No se pudieron cancelar rutas para hoja ${id}:`, err);
      }
    }

    return hojaActualizada;
  }

  /**
   * Retorna los nombres de las ciudades de las paradas intermedias de una frecuencia.
   */
  async obtenerNombresParadas(frecuencia: Frecuencia): Promise<string[]> {
    if (frecuencia.esDirecto || !frecuencia.id) return [];

    const paradas = await this.frecuenciaRepository.obtenerParadas(frecuencia.id);
    return [...paradas]
      .sort((a, b) => a.orden - b.orden)
      .map((parada) => parada.ciudad);
  }

  private validarFecha(fecha: string): void {
    if (!fecha || Number.isNaN(Date.parse(fecha)) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha.trim())) {
      throw new FechaHojaRutaInvalidaException('La fecha de salida es obligatoria y debe ser válida');
    }
  }
}

export const gestionarHojaRutaUseCase = new GestionarHojaRuta(
  new SupabaseHojaRutaRepository(),
  new SupabaseFrecuenciaRepository(),
  new SupabaseRutaRepository(),
);
