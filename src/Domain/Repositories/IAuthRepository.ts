/**
 * IAuthRepository.ts - Contrato de Dominio para Servicios de Autenticación
 */

import { Usuario } from '../Entities/Usuario';

export interface SesionAuth {
  usuario: Usuario;
  token?: string;
}

export interface IAuthRepository {
  iniciarSesion(email: string, password: string): Promise<SesionAuth>;
  cerrarSesion(): Promise<void>;
  obtenerUsuarioActual(): Promise<Usuario | null>;
  recuperarContrasenia(email: string): Promise<void>;
  registrarse(usuario: Usuario, password: string): Promise<Usuario>;
}
