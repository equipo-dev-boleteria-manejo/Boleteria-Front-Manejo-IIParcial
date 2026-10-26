import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObtenerConteoCambios } from './ObtenerConteoCambios';
import type {
  ICambiosRepository,
  SolicitudCambio,
} from '../../Domain/Repositories/ICambiosRepository';
import {
  EstadoCambio,
  TipoCambio,
  PrioridadCambio,
} from '../../Domain/Constants/EstadosSistema';

describe('ObtenerConteoCambios UseCase', () => {
  let mockCambiosRepo: ICambiosRepository;
  let useCase: ObtenerConteoCambios;
  let listaCambios: SolicitudCambio[];

  beforeEach(() => {
    listaCambios = [
      {
        id: 1,
        titulo: 'Cambio 1',
        descripcion: 'Desc',
        tipoCambio: TipoCambio.NORMAL,
        prioridad: PrioridadCambio.MEDIA,
        estado: EstadoCambio.IMPLEMENTADO,
        solicitadoPor: 'dev1',
      },
      {
        id: 2,
        titulo: 'Cambio 2',
        descripcion: 'Desc',
        tipoCambio: TipoCambio.NORMAL,
        prioridad: PrioridadCambio.ALTA,
        estado: EstadoCambio.IMPLEMENTADO,
        solicitadoPor: 'dev2',
      },
      {
        id: 3,
        titulo: 'Cambio 3',
        descripcion: 'Desc',
        tipoCambio: TipoCambio.ESTANDAR,
        prioridad: PrioridadCambio.BAJA,
        estado: EstadoCambio.IMPLEMENTADO,
        solicitadoPor: 'dev3',
      },
      {
        id: 4,
        titulo: 'Cambio 4',
        descripcion: 'Desc',
        tipoCambio: TipoCambio.EMERGENCIA,
        prioridad: PrioridadCambio.URGENTE,
        estado: EstadoCambio.IMPLEMENTADO,
        solicitadoPor: 'dev4',
      },
      {
        id: 5,
        titulo: 'Cambio 5',
        descripcion: 'Desc',
        tipoCambio: TipoCambio.EMERGENCIA,
        prioridad: PrioridadCambio.URGENTE,
        estado: EstadoCambio.SOLICITADO, // No implementado
        solicitadoPor: 'dev5',
      },
    ];

    mockCambiosRepo = {
      solicitarCambio: vi.fn(),
      obtenerCambios: vi.fn().mockResolvedValue(listaCambios),
      obtenerCambioPorId: vi.fn(),
      actualizarEstado: vi.fn(),
    };

    useCase = new ObtenerConteoCambios(mockCambiosRepo);
  });

  it('debe calcular los conteos por tipo de los cambios en estado IMPLEMENTADO', async () => {
    const conteo = await useCase.execute();

    expect(conteo.normal).toBe(2);
    expect(conteo.estandar).toBe(1);
    expect(conteo.emergencia).toBe(1);
    expect(conteo.total).toBe(4);
    expect(mockCambiosRepo.obtenerCambios).toHaveBeenCalledTimes(1);
  });

  it('debe priorizar el método directo contarImplementadosPorTipo si el repositorio lo soporta', async () => {
    (mockCambiosRepo as any).contarImplementadosPorTipo = vi.fn().mockResolvedValue({
      normal: 5,
      estandar: 3,
      emergencia: 2,
    });

    const conteo = await useCase.execute();

    expect(conteo.normal).toBe(5);
    expect(conteo.estandar).toBe(3);
    expect(conteo.emergencia).toBe(2);
    expect(conteo.total).toBe(10);
  });
});
