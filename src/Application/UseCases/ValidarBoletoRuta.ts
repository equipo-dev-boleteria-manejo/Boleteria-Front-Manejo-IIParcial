/**
 * ValidarBoletoRuta.ts - Caso de Uso para Validación y Registro de Abordaje de Boletos QR
 *
 * Arquitectura:
 * - Capa de Aplicación: Centraliza las validaciones de negocio del abordaje de pasajeros.
 * - Desacopla la lógica de negocio de useChoferRuta.
 * - Inversión de Dependencias (DIP): Inyecta IBoletosRepository por constructor.
 */

import type { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository';
import type { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import {
  RutaInvalidaException,
  RutaEstadoInvalidoException,
  BoletoNoValidoParaRutaException,
} from '../../Domain/Exceptions/RutaException';
import { SupabaseBoletosRepository } from '../../Infrastructure/Repositories/SupabaseBoletosRepository';

export interface ValidarBoletoInput {
  ruta: Ruta | null;
  codigo: string;
}

export interface ValidarBoletoOutput {
  ok: boolean;
  mensaje: string;
  boletoId?: number;
}

export class ValidarBoletoRuta {
  constructor(private readonly boletosRepo?: IBoletosRepository) {}

  async ejecutar(input: ValidarBoletoInput): Promise<ValidarBoletoOutput> {
    const { ruta, codigo } = input;

    if (!ruta || !ruta.id) {
      throw new RutaInvalidaException('No hay una ruta asignada para validar boletos.');
    }

    if (ruta.estado !== EstadoRuta.EN_CURSO) {
      throw new RutaEstadoInvalidoException('La ruta debe encontrarse En Curso para validar boletos.');
    }

    const codigoLimpio = codigo ? codigo.trim() : '';
    if (!codigoLimpio) {
      throw new BoletoNoValidoParaRutaException('Debe ingresar un código de boleto válido.');
    }

    let boletoId: number | undefined;

    if (this.boletosRepo) {
      const repoAny = this.boletosRepo as any;
      const boleto = typeof repoAny.obtenerPorCodigo === 'function'
        ? await repoAny.obtenerPorCodigo(codigoLimpio)
        : null;

      if (!boleto) {
        throw new BoletoNoValidoParaRutaException('Boleto no encontrado.');
      }

      boletoId = boleto.id;

      if (typeof repoAny.marcarAbordado === 'function' && boleto.id) {
        await repoAny.marcarAbordado(boleto.id);
      }
    }

    return {
      ok: true,
      mensaje: 'Boleto validado correctamente.',
      boletoId,
    };
  }

  async execute(input: ValidarBoletoInput): Promise<ValidarBoletoOutput> {
    return this.ejecutar(input);
  }
}

export const validarBoletoRutaUseCase = new ValidarBoletoRuta(
  new SupabaseBoletosRepository(),
);
