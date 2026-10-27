import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUsuarios } from './useUsuarios';
import { Usuario } from '../../Domain/Entities/Usuario';
import { Cedula } from '../../Domain/ValueObjects/Cedula';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';
import type { GetUsuarios } from '../../Application/UseCases/GetUsuarios';
import type { CrearUsuario } from '../../Application/UseCases/CrearUsuario';
import type { ActualizarUsuario } from '../../Application/UseCases/ActualizarUsuario';
import type { DesactivarUsuario } from '../../Application/UseCases/DesactivarUsuario';

describe('useUsuarios Composable - Pruebas Unitarias y de Reactividad', () => {
  let mockGetUsuarios: GetUsuarios;
  let mockCrearUsuario: CrearUsuario;
  let mockActualizarUsuario: ActualizarUsuario;
  let mockDesactivarUsuario: DesactivarUsuario;

  const mockUsuario1 = new Usuario(
    'admin@transporte.ec',
    new Cedula('1710034065'),
    'Gisselle',
    'Caiza',
    RolUsuario.ADMINISTRADOR,
    true
  );
  mockUsuario1.id = 'usr-1';

  const mockUsuario2 = new Usuario(
    'chofer@transporte.ec',
    new Cedula('0926687856'),
    'Carlos',
    'Perez',
    RolUsuario.CHOFER,
    true
  );
  mockUsuario2.id = 'usr-2';

  beforeEach(() => {
    mockGetUsuarios = {
      execute: vi.fn().mockResolvedValue([mockUsuario1, mockUsuario2]),
      ejecutar: vi.fn().mockResolvedValue([mockUsuario1, mockUsuario2]),
    } as unknown as GetUsuarios;

    mockCrearUsuario = {
      execute: vi.fn().mockResolvedValue(mockUsuario1),
      ejecutar: vi.fn().mockResolvedValue(mockUsuario1),
    } as unknown as CrearUsuario;

    mockActualizarUsuario = {
      execute: vi.fn().mockResolvedValue(mockUsuario1),
      ejecutar: vi.fn().mockResolvedValue(mockUsuario1),
    } as unknown as ActualizarUsuario;

    mockDesactivarUsuario = {
      execute: vi.fn().mockResolvedValue(undefined),
      ejecutar: vi.fn().mockResolvedValue(undefined),
    } as unknown as DesactivarUsuario;
  });

  it('debe inicializarse con estados limpios por defecto', () => {
    const { usuarios, loading, error, mensajeExito, filtroRol, busqueda } = useUsuarios(
      mockGetUsuarios,
      mockCrearUsuario,
      mockActualizarUsuario,
      mockDesactivarUsuario
    );

    expect(usuarios.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(mensajeExito.value).toBeNull();
    expect(filtroRol.value).toBe('Todos');
    expect(busqueda.value).toBe('');
  });

  it('debe cargar usuarios y actualizar el estado reactivo', async () => {
    const composable = useUsuarios(
      mockGetUsuarios,
      mockCrearUsuario,
      mockActualizarUsuario,
      mockDesactivarUsuario
    );

    await composable.cargarUsuarios();

    expect(composable.usuarios.value).toHaveLength(2);
    expect(composable.usuarios.value[0].nombres).toBe('Gisselle');
    expect(composable.loading.value).toBe(false);
    expect(composable.error.value).toBeNull();
  });

  it('debe manejar errores al fallar la consulta de usuarios', async () => {
    vi.mocked(mockGetUsuarios.ejecutar).mockRejectedValueOnce(new Error('Fallo de red'));
    const composable = useUsuarios(
      mockGetUsuarios,
      mockCrearUsuario,
      mockActualizarUsuario,
      mockDesactivarUsuario
    );

    await composable.cargarUsuarios();

    expect(composable.usuarios.value).toEqual([]);
    expect(composable.error.value).toBe('Fallo de red');
    expect(composable.loading.value).toBe(false);
  });

  it('debe filtrar reactivamente por rol y término de búsqueda', async () => {
    const composable = useUsuarios(
      mockGetUsuarios,
      mockCrearUsuario,
      mockActualizarUsuario,
      mockDesactivarUsuario
    );

    await composable.cargarUsuarios();

    // Filtro por rol Chofer
    composable.filtroRol.value = 'Chofer';
    expect(composable.usuariosFiltrados.value).toHaveLength(1);
    expect(composable.usuariosFiltrados.value[0].rol).toBe(RolUsuario.CHOFER);

    // Búsqueda por nombre
    composable.filtroRol.value = 'Todos';
    composable.busqueda.value = 'gisselle';
    expect(composable.usuariosFiltrados.value).toHaveLength(1);
    expect(composable.usuariosFiltrados.value[0].email).toBe('admin@transporte.ec');
  });

  it('debe calcular la paginación correctamente', async () => {
    const composable = useUsuarios(
      mockGetUsuarios,
      mockCrearUsuario,
      mockActualizarUsuario,
      mockDesactivarUsuario
    );

    await composable.cargarUsuarios();
    composable.registrosPorPagina.value = 1;

    expect(composable.totalUsuarios.value).toBe(2);
    expect(composable.totalPaginas.value).toBe(2);
    expect(composable.usuariosPaginados.value).toHaveLength(1);
    expect(composable.usuariosPaginados.value[0].id).toBe('usr-1');

    composable.paginaActual.value = 2;
    expect(composable.usuariosPaginados.value[0].id).toBe('usr-2');
  });

  it('debe registrar un nuevo usuario y recargar la lista', async () => {
    const composable = useUsuarios(
      mockGetUsuarios,
      mockCrearUsuario,
      mockActualizarUsuario,
      mockDesactivarUsuario
    );

    const dto = {
      email: 'nuevo@transporte.ec',
      cedula: '1710034065',
      nombres: 'Nuevo',
      apellidos: 'Usuario',
      rol: RolUsuario.OFICINISTA,
    };

    await composable.crear(dto);

    expect(mockCrearUsuario.ejecutar).toHaveBeenCalledWith(dto);
    expect(mockGetUsuarios.ejecutar).toHaveBeenCalled();
    expect(composable.mensajeExito.value).toContain('registrado con éxito');
  });

  it('debe actualizar un usuario existente y recargar la lista', async () => {
    const composable = useUsuarios(
      mockGetUsuarios,
      mockCrearUsuario,
      mockActualizarUsuario,
      mockDesactivarUsuario
    );

    const dto = {
      id: 'usr-1',
      nombres: 'Gisselle Modificada',
      apellidos: 'Caiza',
      rol: RolUsuario.ADMINISTRADOR,
    };

    await composable.actualizar(dto);

    expect(mockActualizarUsuario.ejecutar).toHaveBeenCalledWith(dto);
    expect(mockGetUsuarios.ejecutar).toHaveBeenCalled();
    expect(composable.mensajeExito.value).toContain('actualizado correctamente');
  });

  it('debe desactivar un usuario y recargar la lista', async () => {
    const composable = useUsuarios(
      mockGetUsuarios,
      mockCrearUsuario,
      mockActualizarUsuario,
      mockDesactivarUsuario
    );

    await composable.desactivar('usr-1');

    expect(mockDesactivarUsuario.ejecutar).toHaveBeenCalledWith('usr-1');
    expect(mockGetUsuarios.ejecutar).toHaveBeenCalled();
    expect(composable.mensajeExito.value).toContain('dado de baja');
  });
});
