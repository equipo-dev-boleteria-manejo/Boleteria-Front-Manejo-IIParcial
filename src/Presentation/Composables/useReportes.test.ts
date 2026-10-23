import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useReportes } from './useReportes';
import type { IAuditRepository, EventoAuditoria } from '../../Domain/Repositories/IAuditRepository';
import { ObtenerConteoCambios } from '../../Application/UseCases/ObtenerConteoCambios';

describe('useReportes Composable', () => {
  let mockAuditRepo: IAuditRepository;
  let mockConteoCambiosService: ObtenerConteoCambios;
  let eventosMock: EventoAuditoria[];

  beforeEach(() => {
    eventosMock = [
      {
        id: 1,
        accion: 'LOGIN_EXITOSO',
        detalle: 'El usuario inició sesión',
        fecha: new Date(),
        resultado: 'Exito',
      },
    ];

    mockAuditRepo = {
      registrarEvento: vi.fn().mockResolvedValue(undefined),
      obtenerEventos: vi.fn().mockResolvedValue(eventosMock),
      obtenerEventosPorUsuario: vi.fn(),
    };

    mockConteoCambiosService = {
      execute: vi.fn().mockResolvedValue({
        normal: 3,
        estandar: 2,
        emergencia: 1,
        total: 6,
      }),
      ejecutar: vi.fn(),
    } as unknown as ObtenerConteoCambios;
  });

  it('debe cargar los eventos de auditoría mediante el repositorio inyectado', async () => {
    const { eventosAuditoria, loading, error, cargarAuditoria } = useReportes(
      mockAuditRepo,
      mockConteoCambiosService
    );

    expect(loading.value.auditoria).toBe(false);
    expect(eventosAuditoria.value).toEqual([]);

    await cargarAuditoria(10);

    expect(loading.value.auditoria).toBe(false);
    expect(eventosAuditoria.value).toEqual(eventosMock);
    expect(mockAuditRepo.obtenerEventos).toHaveBeenCalledWith(10);
    expect(error.value.auditoria).toBeNull();
  });

  it('debe cargar el balance de cambios CCB usando el caso de uso desacoplado', async () => {
    const { resumenCambios, loading, cargarResumenCambios } = useReportes(
      mockAuditRepo,
      mockConteoCambiosService
    );

    await cargarResumenCambios();

    expect(loading.value.cambios).toBe(false);
    expect(resumenCambios.value).toEqual({
      normal: 3,
      estandar: 2,
      emergencia: 1,
      total: 6,
    });
    expect(mockConteoCambiosService.execute).toHaveBeenCalledTimes(1);
  });

  it('debe registrar un evento de auditoría sin lanzar error si la persistencia falla', async () => {
    mockAuditRepo.registrarEvento = vi.fn().mockRejectedValue(new Error('DB error'));
    const { registrarEvento } = useReportes(mockAuditRepo, mockConteoCambiosService);

    // No debe lanzar excepción
    await expect(registrarEvento('TEST_ACCION', 'Detalle')).resolves.toBeUndefined();
  });
});
