/**
 * IUsuarioRepository.ts - Contrato de Dominio para el Repositorio de Usuarios
 */

import { Usuario } from '../Entities/Usuario';
import { RolUsuario } from '../Constants/EstadosSistema';

export interface UsuarioFiltros {
  rol?: RolUsuario;
  activo?: boolean;
  cooperativaId?: number;
}

export interface IUsuarioRepository {
  obtenerPorId(id: string): Promise<Usuario | null>;
  obtenerPorEmail(email: string): Promise<Usuario | null>;
  obtenerPorCedula(cedula: string): Promise<Usuario | null>;
  obtenerTodos(filtros?: UsuarioFiltros): Promise<Usuario[]>;
  guardar(usuario: Usuario): Promise<Usuario>;
  actualizar(usuario: Usuario): Promise<Usuario>;
  desactivar(id: string): Promise<void>;
}
