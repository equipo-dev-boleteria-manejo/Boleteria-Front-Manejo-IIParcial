/**
 * mocksFrecuencias.ts - Dobles de prueba compartidos por los tests del módulo de Frecuencias
 *
 * Solo lo importan archivos .test.ts: nunca forma parte del código de producción.
 */

import { vi } from 'vitest';
import { Frecuencia, ParadaIntermedia } from '../../Domain/Entities/Frecuencia';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';

export function crearFrecuenciaRepoMock(): IFrecuenciaRepository {
  return {
    obtenerTodas: vi.fn(),
    obtenerPorId: vi.fn(),
    obtenerPorCooperativa: vi.fn(),
    obtenerPorIdentificador: vi.fn(),
    buscarPorTramo: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    desactivar: vi.fn(),
    obtenerParadas: vi.fn(),
    agregarParada: vi.fn(),
    actualizarParada: vi.fn(),
    eliminarParada: vi.fn(),
  };
}

/** Quito -> Cuenca, con paradas a las 2h y 4h. */
export function frecuenciaDePrueba(id = 1, horaSalida = '08:00', cooperativaId = 1): Frecuencia {
  const frecuencia = new Frecuencia(cooperativaId, 'Quito', 'Cuenca', horaSalida, `FR-${id}`);
  frecuencia.id = id;
  frecuencia.establecerParadas([
    new ParadaIntermedia('Latacunga', 1, 120),
    new ParadaIntermedia('Riobamba', 2, 240),
  ]);
  return frecuencia;
}
