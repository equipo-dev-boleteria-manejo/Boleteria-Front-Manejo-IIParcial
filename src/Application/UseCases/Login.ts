/**
 * Login.ts - Caso de Uso Canónico de Autenticación (Golden Standard)
 *
 * Arquitectura:
 * - Inversión de Dependencias (DIP): Recibe IAuthRepository y IAuditRepository opcional.
 * - Cero acoplamiento a Vue, DOM o Supabase directo.
 * - Registro de Auditoría transparente (éxito y fallas de seguridad).
 */

import type { IAuthRepository, SesionAuth } from '../../Domain/Repositories/IAuthRepository';
import type { IAuditRepository } from '../../Domain/Repositories/IAuditRepository';
import { Usuario } from '../../Domain/Entities/Usuario';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { SupabaseAuthRepository } from '../../Infrastructure/Repositories/SupabaseAuthRepository';
import { SupabaseAuditRepository } from '../../Infrastructure/Repositories/SupabaseAuditRepository';
import type { LoginDto } from '../Dtos/LoginDto';

export class LoginUseCase {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly auditRepo?: IAuditRepository
  ) {}

  /**
   * Ejecuta el inicio de sesión validando el formato de entrada
   * y delegando la autenticación al repositorio con registro de auditoría.
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

    try {
      const sesion = await this.authRepo.iniciarSesion(email, password);

      // Auditoría de acceso exitoso
      if (this.auditRepo) {
        this.auditRepo.registrarEvento({
          accion: 'INICIO_SESION',
          usuarioId: sesion.usuario?.id || null,
          entidadAfectada: 'Usuarios',
          entidadId: sesion.usuario?.id,
          detalle: `Inicio de sesión exitoso para ${email} (Rol: ${sesion.usuario?.rol})`,
          resultado: 'Exito',
        }).catch(() => {});
      }

      return sesion;
    } catch (err: unknown) {
      // Auditoría de intento de acceso fallido o bloqueado
      if (this.auditRepo) {
        const errorMsg = err instanceof Error ? err.message : 'Credenciales inválidas';
        this.auditRepo.registrarEvento({
          accion: 'INICIO_SESION_FALLIDO',
          usuarioId: null,
          entidadAfectada: 'Usuarios',
          detalle: `Intento de acceso fallido para ${email}: ${errorMsg}`,
          resultado: 'Fallo',
        }).catch(() => {});
      }
      throw err;
    }
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
    try {
      const usuario = await this.authRepo.obtenerUsuarioActual().catch(() => null);
      if (this.auditRepo && usuario) {
        this.auditRepo.registrarEvento({
          accion: 'CIERRE_SESION',
          usuarioId: usuario.id,
          entidadAfectada: 'Usuarios',
          entidadId: usuario.id,
          detalle: `Cierre de sesión de ${usuario.email}`,
          resultado: 'Exito',
        }).catch(() => {});
      }
    } finally {
      await this.authRepo.cerrarSesion();
    }
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
export const loginUseCase = new LoginUseCase(
  new SupabaseAuthRepository(),
  new SupabaseAuditRepository()
);
