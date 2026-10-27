/**
 * useUsuarios.ts - Composable de Presentación para Gestión de Usuarios
 *
 * Arquitectura:
 * - Lógica Headless (100% desacoplada de la UI visual).
 * - Orquesta los casos de uso: GetUsuarios, CrearUsuario, ActualizarUsuario y DesactivarUsuario.
 * - Inyección de dependencias con valores por defecto (Golden Standard).
 * - Manejo de reactividad, filtrado, paginación y estados de error/éxito.
 */

import { ref, computed } from 'vue';
import type { Usuario } from '../../Domain/Entities/Usuario';
import type { CrearUsuarioDto, ActualizarUsuarioDto } from '../../Application/Dtos/UsuarioDto';
import {
  GetUsuarios,
  getUsuariosUseCase as defaultGetUsuarios,
} from '../../Application/UseCases/GetUsuarios';
import {
  CrearUsuario,
  crearUsuarioUseCase as defaultCrearUsuario,
} from '../../Application/UseCases/CrearUsuario';
import {
  ActualizarUsuario,
  actualizarUsuarioUseCase as defaultActualizarUsuario,
} from '../../Application/UseCases/ActualizarUsuario';
import {
  DesactivarUsuario,
  desactivarUsuarioUseCase as defaultDesactivarUsuario,
} from '../../Application/UseCases/DesactivarUsuario';

export function useUsuarios(
  getUsuariosService: GetUsuarios = defaultGetUsuarios,
  crearUsuarioService: CrearUsuario = defaultCrearUsuario,
  actualizarUsuarioService: ActualizarUsuario = defaultActualizarUsuario,
  desactivarUsuarioService: DesactivarUsuario = defaultDesactivarUsuario,
) {
  const usuarios = ref<Usuario[]>([]);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const mensajeExito = ref<string | null>(null);

  // Estados reactivos de filtrado y paginación
  const filtroRol = ref<string>('Todos');
  const busqueda = ref<string>('');
  const paginaActual = ref<number>(1);
  const registrosPorPagina = ref<number>(10);

  const usuariosFiltrados = computed(() => {
    let resultado = usuarios.value;

    if (filtroRol.value && filtroRol.value !== 'Todos') {
      const rolBuscado = filtroRol.value.toLowerCase().trim();
      resultado = resultado.filter((u) => {
        const rolActual = (u.rol || '').toLowerCase().trim();
        if (rolBuscado === 'usuario final' || rolBuscado === 'cliente') {
          return rolActual === 'usuario final' || rolActual === 'cliente';
        }
        return rolActual === rolBuscado;
      });
    }

    if (busqueda.value.trim()) {
      const q = busqueda.value.toLowerCase().trim();
      resultado = resultado.filter((u) => {
        const nombres = (u.nombres || '').toLowerCase();
        const apellidos = (u.apellidos || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const cedula = u.cedula?.valor || '';
        return (
          nombres.includes(q) ||
          apellidos.includes(q) ||
          email.includes(q) ||
          cedula.includes(q)
        );
      });
    }

    return resultado;
  });

  const totalUsuarios = computed(() => usuariosFiltrados.value.length);
  const totalPaginas = computed(() =>
    Math.max(1, Math.ceil(totalUsuarios.value / registrosPorPagina.value))
  );

  const usuariosPaginados = computed(() => {
    const inicio = (paginaActual.value - 1) * registrosPorPagina.value;
    return usuariosFiltrados.value.slice(inicio, inicio + registrosPorPagina.value);
  });

  function limpiarMensajes(): void {
    error.value = null;
    mensajeExito.value = null;
  }

  async function cargarUsuarios(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      usuarios.value = await getUsuariosService.ejecutar();
    } catch (err: any) {
      error.value = err.message || 'Error al cargar usuarios de la plataforma';
      usuarios.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function crear(dto: CrearUsuarioDto): Promise<Usuario> {
    loading.value = true;
    limpiarMensajes();

    try {
      const nuevoUsuario = await crearUsuarioService.ejecutar(dto);
      mensajeExito.value = `Usuario '${dto.nombres} ${dto.apellidos}' registrado con éxito.`;
      await cargarUsuarios();
      return nuevoUsuario;
    } catch (err: any) {
      error.value = err.message || 'Error al registrar el usuario';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function actualizar(dto: ActualizarUsuarioDto): Promise<Usuario> {
    loading.value = true;
    limpiarMensajes();

    try {
      const usuarioActualizado = await actualizarUsuarioService.ejecutar(dto);
      mensajeExito.value = `Usuario actualizado correctamente.`;
      await cargarUsuarios();
      return usuarioActualizado;
    } catch (err: any) {
      error.value = err.message || 'Error al actualizar el usuario';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function desactivar(id: string): Promise<void> {
    loading.value = true;
    limpiarMensajes();

    try {
      await desactivarUsuarioService.ejecutar(id);
      mensajeExito.value = 'Usuario dado de baja exitosamente.';
      await cargarUsuarios();
    } catch (err: any) {
      error.value = err.message || 'Error al desactivar el usuario';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function toggleActivo(usuario: Usuario): Promise<void> {
    if (!usuario.id) return;
    return actualizar({
      id: usuario.id,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      rol: usuario.rol,
      cooperativaId: usuario.cooperativaId,
      activo: !usuario.activo,
    }).then(() => undefined);
  }

  return {
    usuarios,
    loading,
    error,
    mensajeExito,
    filtroRol,
    busqueda,
    paginaActual,
    registrosPorPagina,
    usuariosFiltrados,
    totalUsuarios,
    totalPaginas,
    usuariosPaginados,
    limpiarMensajes,
    cargarUsuarios,
    crear,
    actualizar,
    desactivar,
    toggleActivo,
  };
}
