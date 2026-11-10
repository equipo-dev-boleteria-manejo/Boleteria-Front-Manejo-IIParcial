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

  it('debe filtrar y paginar eventos reactivamente desde el composable', async () => {
    const composable = useReportes(mockAuditRepo, mockConteoCambiosService);
    composable.eventosAuditoria.value = [
      { id: 1, accion: 'LOGIN', detalle: 'Ingreso', resultado: 'Exito', fecha: new Date() },
      { id: 2, accion: 'COMPRA', detalle: 'Boleto vendido', resultado: 'Exito', fecha: new Date() },
      { id: 3, accion: 'FALLO', detalle: 'Error de red', resultado: 'Fallo', fecha: new Date() },
    ];

    composable.busqueda.value = 'Boleto';
    expect(composable.eventosFiltrados.value.length).toBe(1);
    expect(composable.eventosPaginados.value[0].accion).toBe('COMPRA');

    composable.limpiarFiltros();
    expect(composable.busqueda.value).toBe('');
    expect(composable.eventosFiltrados.value.length).toBe(3);

    composable.filtroResultado.value = 'Fallo';
    expect(composable.eventosFiltrados.value.length).toBe(1);
    expect(composable.eventosFiltrados.value[0].accion).toBe('FALLO');
  });

  it('debe tolerar tildes, mayúsculas y guiones bajos en la búsqueda', async () => {
    const composable = useReportes(mockAuditRepo, mockConteoCambiosService);
    composable.eventosAuditoria.value = [
      { id: 1, accion: 'ERROR_CONEXION', detalle: 'Fallo de pasarela', resultado: 'Fallo', fecha: new Date() },
      { id: 2, accion: 'LOGIN_EXITOSO', detalle: 'Sesión iniciada', resultado: 'Exito', fecha: new Date() },
    ];

    // Buscar "error conexión" (con tilde y espacio en lugar de guion bajo)
    composable.busqueda.value = 'error conexión';
    expect(composable.eventosFiltrados.value.length).toBe(1);
    expect(composable.eventosFiltrados.value[0].accion).toBe('ERROR_CONEXION');

    // Buscar "sesion" (sin tilde cuando en el detalle está "Sesión")
    composable.busqueda.value = 'sesion';
    expect(composable.eventosFiltrados.value.length).toBe(1);
    expect(composable.eventosFiltrados.value[0].accion).toBe('LOGIN_EXITOSO');
  });

  it('debe calcular métricas de auditoría del sistema (total, exitos, fallos, seguridad)', async () => {
    const composable = useReportes(mockAuditRepo, mockConteoCambiosService);
    composable.eventosAuditoria.value = [
      { id: 1, accion: 'LOGIN_EXITOSO', detalle: 'Sesión iniciada', resultado: 'Exito', fecha: new Date() },
      { id: 2, accion: 'LOGIN_FALLIDO', detalle: 'Clave errónea', resultado: 'Fallo', fecha: new Date() },
      { id: 3, accion: 'COMPRA_BOLETO', detalle: 'Pago procesado', resultado: 'Exito', fecha: new Date() },
      { id: 4, accion: 'REGISTRO_USUARIO', detalle: 'Nuevo usuario', resultado: 'Exito', fecha: new Date() },
    ];

    expect(composable.metricasAuditoria.value).toEqual({
      total: 4,
      exitos: 3,
      fallos: 1,
      seguridad: 3, // LOGIN_EXITOSO, LOGIN_FALLIDO, REGISTRO_USUARIO
    });
  });
});
