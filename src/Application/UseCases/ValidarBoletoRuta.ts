/**
 * ValidarBoletoRuta.ts - Caso de Uso para Validación y Registro de Abordaje de Boletos QR
 *
 * Arquitectura:
 * - Capa de Aplicación: Centraliza las validaciones de negocio del abordaje de pasajeros.
 * - Desacopla la lógica de negocio de useChoferRuta.
 * - Inversión de Dependencias (DIP): Inyecta IAbordajeBoletosRepository por constructor.
 *
 * Reglas: la ruta debe estar En Curso; el boleto debe existir, pertenecer a esa ruta y estar habilitado
 * (Emitido o Aprobado). Un boleto ya abordado no puede volver a usarse.
 */

import type { IAbordajeBoletosRepository } from '../../Domain/Repositories/IAbordajeBoletosRepository';
import type { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoBoleto, EstadoRuta } from '../../Domain/Constants/EstadosSistema';
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

const ESTADOS_HABILITADOS_PARA_ABORDAR: readonly string[] = [EstadoBoleto.EMITIDO, EstadoBoleto.APROBADO];

export class ValidarBoletoRuta {
  constructor(private readonly boletosRepo: IAbordajeBoletosRepository) {}

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

    const boleto = await this.boletosRepo.obtenerPorCodigo(codigoLimpio);

    if (!boleto || !boleto.id) {
      throw new BoletoNoValidoParaRutaException('Boleto no encontrado.');
    }

    if (boleto.rutaId !== ruta.id) {
      throw new BoletoNoValidoParaRutaException('El boleto no corresponde a esta ruta.');
    }

    if (boleto.estado === EstadoBoleto.ABORDADO) {
      throw new BoletoNoValidoParaRutaException('El boleto ya fue utilizado para abordar.');
    }

    if (!ESTADOS_HABILITADOS_PARA_ABORDAR.includes(boleto.estado)) {
      throw new BoletoNoValidoParaRutaException(
        `El boleto no está habilitado para abordar (estado: ${boleto.estado}).`,
      );
    }

    await this.boletosRepo.marcarAbordado(boleto.id);

    return {
      ok: true,
      mensaje: 'Boleto validado correctamente.',
      boletoId: boleto.id,
    };
  }

  async execute(input: ValidarBoletoInput): Promise<ValidarBoletoOutput> {
    return this.ejecutar(input);
  }
}

export const validarBoletoRutaUseCase = new ValidarBoletoRuta(
  new SupabaseBoletosRepository(),
);
