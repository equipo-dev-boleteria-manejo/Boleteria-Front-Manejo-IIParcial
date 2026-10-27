/**
 * SuperAdmin.ts - Configuración canónica del Super Administrador del Sistema
 *
 * Regla de Dominio:
 * El usuario Super Administrador es un registro base e intocable.
 * Ninguna operación del sistema puede darlo de baja, desactivarlo ni revocarle su rol.
 */

import { RolUsuario } from './EstadosSistema';

export const SUPER_ADMIN_CONFIG = {
  EMAIL_PRIMARY: 'admin@transporte.ec',
  EMAIL_SECONDARY: 'superadmin@transporte.ec',
  CEDULA: '1710034065',
  DEFAULT_PASSWORD: 'Admin1234*',
  NOMBRES: 'Super',
  APELLIDOS: 'Administrador',
  ROL: RolUsuario.ADMIN,
} as const;

/**
 * Determina si un email o identificador corresponde al Super Administrador base.
 */
export function esSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  const valor = email.trim().toLowerCase();
  return (
    valor === SUPER_ADMIN_CONFIG.EMAIL_PRIMARY.toLowerCase() ||
    valor === SUPER_ADMIN_CONFIG.EMAIL_SECONDARY.toLowerCase()
  );
}
