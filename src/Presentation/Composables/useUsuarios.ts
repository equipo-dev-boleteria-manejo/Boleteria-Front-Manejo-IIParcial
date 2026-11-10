/**
 * useUsuarios.ts - Composable de Presentación para Gestión de Usuarios
 *
 * Arquitectura:
 * - Lógica Headless (100% desacoplada de la UI visual).
 * - Orquesta los casos de uso: GetUsuarios, CrearUsuario, ActualizarUsuario y DesactivarUsuario.
 * - Inyección de dependencias con valores por defecto (Golden Standard).
 * - Manejo de reactividad, filtrado, paginación y estados de error/éxito.
 * - Protección del Super Administrador inmutable.
 */

import { ref, computed } from 'vue';
import type { Usuario } from '../../Domain/Entities/Usuario';
import type { CrearUsuarioDto, ActualizarUsuarioDto } from '../../Application/Dtos/UsuarioDto';
import { esSuperAdmin } from '../../Domain/Constants/SuperAdmin';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';
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
  const choferesActivos = computed(() =>
    usuarios.value.filter(
      (usuario): usuario is Usuario & { id: string } =>
        Boolean(usuario.id) && usuario.activo && usuario.rol === RolUsuario.CHOFER,
    ),
  );
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const mensajeExito = ref<string | null>(null);

  // Estados de control para UI (Filtros y Paginación)
  const filtroRol = ref<string>('Todos');
  const busqueda = ref<string>('');
  const paginaActual = ref<number>(1);
  const registrosPorPagina = ref<number>(10);

  const usuariosFiltrados = computed(() => {
    return usuarios.value.filter((u) => {
      // Filtro por Rol (robusto contra valores del enum o texto parcial)
      if (filtroRol.value !== 'Todos') {
        const rolNormalizado = (u.rol || '').toLowerCase().trim();
        const filtroNormalizado = filtroRol.value.toLowerCase().trim();
        
        const coincideExacto = rolNormalizado === filtroNormalizado;
        const coincideAdmin = (filtroNormalizado === 'admin' || filtroNormalizado.includes('administrador')) &&
          (rolNormalizado === 'admin' || rolNormalizado.includes('administrador'));
        const coincideCliente = (filtroNormalizado === 'cliente' || filtroNormalizado.includes('usuario')) &&
          (rolNormalizado === 'cliente' || rolNormalizado.includes('usuario'));
        const coincideParcial = rolNormalizado.includes(filtroNormalizado) || filtroNormalizado.includes(rolNormalizado);

        if (!coincideExacto && !coincideAdmin && !coincideCliente && !coincideParcial) {
          return false;
        }
      }

      // Filtro de Búsqueda de texto (nombres, apellidos, email, cédula)
      if (busqueda.value.trim() !== '') {
        const q = busqueda.value.trim().toLowerCase();
        const nombres = (u.nombres || '').toLowerCase();
        const apellidos = (u.apellidos || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const cedula = (u.cedula?.valor || '').toLowerCase();

        return (
          nombres.includes(q) ||
          apellidos.includes(q) ||
          email.includes(q) ||
          cedula.includes(q)
        );
      }

      return true;
    });
  });

  const totalUsuarios = computed(() => usuariosFiltrados.value.length);

  const totalPaginas = computed(() => {
    return Math.max(1, Math.ceil(totalUsuarios.value / registrosPorPagina.value));
  });

  const usuariosPaginados = computed(() => {
    const inicio = (paginaActual.value - 1) * registrosPorPagina.value;
    const fin = inicio + registrosPorPagina.value;
    return usuariosFiltrados.value.slice(inicio, fin);
  });

  function limpiarMensajes() {
    error.value = null;
    mensajeExito.value = null;
  }

  async function cargarUsuarios(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      usuarios.value = await getUsuariosService.ejecutar();
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error al cargar la lista de usuarios';
    } finally {
      loading.value = false;
    }
  }

  async function crear(dto: CrearUsuarioDto): Promise<Usuario> {
    loading.value = true;
    limpiarMensajes();

    try {
      const nuevoUsuario = await crearUsuarioService.ejecutar(dto);
      await cargarUsuarios();
      mensajeExito.value = 'Usuario registrado con éxito.';
      return nuevoUsuario;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error al registrar el usuario';
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
      await cargarUsuarios();
      mensajeExito.value = 'Usuario actualizado correctamente.';
      return usuarioActualizado;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error al actualizar el usuario';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function desactivar(id: string): Promise<void> {
    loading.value = true;
    limpiarMensajes();

    try {
      const target = usuarios.value.find((u) => u.id === id);
      if (target && esSuperAdmin(target.email)) {
        error.value = 'El Super Administrador es un registro base del sistema y no puede ser desactivado.';
        return;
      }

      await desactivarUsuarioService.ejecutar(id);
      await cargarUsuarios();
      mensajeExito.value = 'Usuario dado de baja exitosamente.';
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error al desactivar el usuario';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function toggleActivo(usuario: Usuario): Promise<void> {
    if (!usuario.id) return;
    if (esSuperAdmin(usuario.email)) {
      error.value = 'El Super Administrador es un registro base del sistema y no puede ser desactivado.';
      return;
    }
    return actualizar({
      id: usuario.id,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      rol: usuario.rol,
      cooperativaId: usuario.cooperativaId,
      activo: !usuario.activo,
    }).then(() => undefined);
  }

  async function existeCedula(cedula: string): Promise<boolean> {
    const c = cedula.trim();
    if (!c) return false;
    // Si ya tenemos los usuarios cargados en memoria, verificamos localmente primero
    const local = usuarios.value.some((u) => u.cedula?.valor === c);
    if (local) return true;
    // Si no está local, podemos delegar a la carga o usar el caso de uso si fuera necesario
    return false;
  }

  async function existeEmail(email: string): Promise<boolean> {
    const e = email.trim().toLowerCase();
    if (!e) return false;
    const local = usuarios.value.some((u) => u.email.toLowerCase() === e);
    return local;
  }

  return {
    usuarios,
    choferesActivos,
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
    existeCedula,
    existeEmail,
  };
}
