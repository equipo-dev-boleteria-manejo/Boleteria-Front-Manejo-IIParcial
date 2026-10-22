/**
 * Login.ts - Caso de Uso Canónico de Autenticación (Golden Standard)
 *
 * Arquitectura:
 * - Inversión de Dependencias (DIP): Recibe IAuthRepository por constructor.
 * - Cero acoplamiento a Vue, DOM o Supabase directo.
 * - Validación de entradas y manejo de excepciones canónicas de dominio.
 */

import type { IAuthRepository, SesionAuth } from '../../Domain/Repositories/IAuthRepository';
import { Usuario } from '../../Domain/Entities/Usuario';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { SupabaseAuthRepository } from '../../Infrastructure/Repositories/SupabaseAuthRepository';
import type { LoginDto } from '../Dtos/LoginDto';

export class LoginUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  /**
   * Ejecuta el inicio de sesión validando el formato de entrada
   * y delegando la autenticación al repositorio.
   */
  async execute(dto: LoginDto): Promise<SesionAuth> {
    const email = dto.email ? dto.email.trim().toLowerCase() : '';
    const password = dto.password ? dto.password.trim() : '';

    if (!email || !password) {
      throw new DomainException('El correo electrónico y la contraseña son requeridos');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new DomainException('El formato del correo electrónico no es válido');
    }

    return await this.authRepo.iniciarSesion(email, password);
  }

  /**
   * Alias en español para mantener compatibilidad con las convenciones del equipo.
   */
  async ejecutar(dto: LoginDto): Promise<SesionAuth> {
    return this.execute(dto);
  }

  /**
   * Cierra la sesión activa del usuario.
   */
  async logout(): Promise<void> {
    await this.authRepo.cerrarSesion();
  }

  async cerrarSesion(): Promise<void> {
    return this.logout();
  }

  /**
   * Obtiene la entidad del usuario actualmente autenticado en el sistema.
   */
  async getCurrentUser(): Promise<Usuario | null> {
    return await this.authRepo.obtenerUsuarioActual();
  }

  async obtenerUsuarioActual(): Promise<Usuario | null> {
    return this.getCurrentUser();
  }
}

// Instancia por defecto lista para ser consumida en la capa de presentación
export const loginUseCase = new LoginUseCase(new SupabaseAuthRepository());
