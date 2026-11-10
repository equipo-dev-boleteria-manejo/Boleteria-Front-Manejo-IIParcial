/**
 * UsuarioDto.ts - DTOs para creación, edición y visualización de usuarios
 */

import { RolUsuario } from '../../Domain/Constants/EstadosSistema';

export interface CrearUsuarioDto {
  email: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  rol: RolUsuario;
  cooperativaId?: number | null;
  password?: string;
}

export interface ActualizarUsuarioDto {
  id: string;
  nombres: string;
  apellidos: string;
  rol: RolUsuario;
  cooperativaId?: number | null;
  activo?: boolean;
}

export interface UsuarioResumenDto {
  id: string;
  email: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  rol: RolUsuario;
  activo: boolean;
  cooperativaId?: number | null;
  createdAt?: string;
}
