/**
 * mocksFrecuencias.ts - Dobles de prueba compartidos por los tests del módulo de Frecuencias
 *
 * Solo lo importan archivos .test.ts: nunca forma parte del código de producción.
 */

import { vi } from 'vitest';
import { Bus } from '../../Domain/Entities/Bus';
import { Frecuencia, ParadaIntermedia } from '../../Domain/Entities/Frecuencia';
import type { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import type { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import { EstadoBus } from '../../Domain/Constants/EstadosSistema';

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

export function crearBusRepoMock(): IBusRepository {
  return {
    obtenerTodos: vi.fn(),
    obtenerPorCooperativa: vi.fn(),
    obtenerDisponiblesParaOperar: vi.fn(),
    obtenerPorId: vi.fn(),
    obtenerPorPlaca: vi.fn(),
    obtenerPorNumero: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    cambiarEstado: vi.fn(),
    eliminarLogico: vi.fn(),
  };
}

export function crearRutaRepoMock(): IRutaRepository {
  return {
    obtenerTodas: vi.fn(),
    obtenerPorId: vi.fn(),
    obtenerPorHojaRuta: vi.fn(),
    obtenerPorBusYFecha: vi.fn(),
    obtenerPorChoferYFecha: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    cambiarEstado: vi.fn(),
    eliminar: vi.fn(),
  };
}

/** Quito -> Cuenca, con paradas a las 2h y 4h (duración mínima: 240 min). */
export function frecuenciaDePrueba(id = 1, horaSalida = '08:00', cooperativaId = 1): Frecuencia {
  const frecuencia = new Frecuencia(cooperativaId, 'Quito', 'Cuenca', horaSalida, `FR-${id}`);
  frecuencia.id = id;
  frecuencia.establecerParadas([
    new ParadaIntermedia('Latacunga', 1, 120),
    new ParadaIntermedia('Riobamba', 2, 240),
  ]);
  return frecuencia;
}

export function busDePrueba(id = 10, cooperativaId = 1, estado: EstadoBus = EstadoBus.ACTIVO): Bus {
  const bus = new Bus(cooperativaId, `${id}`, `PBA-${id}00`, 40, estado);
  bus.id = id;
  return bus;
}
