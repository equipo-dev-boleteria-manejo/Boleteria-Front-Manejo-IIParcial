/**
 * ObtenerConteoCambios.ts - Caso de Uso para Estadísticas de Gestión de Cambios (CCB)
 */

import type { ICambiosRepository } from '../../Domain/Repositories/ICambiosRepository';
import { EstadoCambio, TipoCambio } from '../../Domain/Constants/EstadosSistema';
import { SupabaseCambiosRepository } from '../../Infrastructure/Repositories/SupabaseCambiosRepository';

export interface ConteoCambiosResultado {
  normal: number;
  estandar: number;
  emergencia: number;
  total: number;
}

export class ObtenerConteoCambios {
  constructor(private readonly cambiosRepo: ICambiosRepository) {}

  async execute(): Promise<ConteoCambiosResultado> {
    // Si el repositorio ya cuenta con el método especializado, lo utiliza
    if (typeof (this.cambiosRepo as any).contarImplementadosPorTipo === 'function') {
      const resultadoDirecto = await (this.cambiosRepo as any).contarImplementadosPorTipo();
      const normal = resultadoDirecto.normal ?? 0;
      const estandar = resultadoDirecto.estandar ?? 0;
      const emergencia = resultadoDirecto.emergencia ?? 0;
      return {
        normal,
        estandar,
        emergencia,
        total: normal + estandar + emergencia,
      };
    }

    const todosLosCambios = await this.cambiosRepo.obtenerCambios();
    const implementados = todosLosCambios.filter(
      (cambio) => cambio.estado === EstadoCambio.IMPLEMENTADO
    );

    let normal = 0;
    let estandar = 0;
    let emergencia = 0;

    for (const cambio of implementados) {
      if (cambio.tipoCambio === TipoCambio.NORMAL) {
        normal += 1;
      } else if (cambio.tipoCambio === TipoCambio.ESTANDAR) {
        estandar += 1;
      } else if (cambio.tipoCambio === TipoCambio.EMERGENCIA) {
        emergencia += 1;
      }
    }

    return {
      normal,
      estandar,
      emergencia,
      total: normal + estandar + emergencia,
    };
  }

  async ejecutar(): Promise<ConteoCambiosResultado> {
    return this.execute();
  }
}

export const obtenerConteoCambiosUseCase = new ObtenerConteoCambios(
  new SupabaseCambiosRepository()
);
