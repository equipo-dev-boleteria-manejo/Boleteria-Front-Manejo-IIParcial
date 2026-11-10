/**
 * DesactivarUsuario.ts - Caso de Uso para Baja Lógica de Usuarios
 * Registra auditoría automática de baja lógica.
 */

import type { IUsuarioRepository } from '../../Domain/Repositories/IUsuarioRepository';
import type { IAuditRepository } from '../../Domain/Repositories/IAuditRepository';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { UsuarioNoEncontradoException } from '../../Domain/Exceptions/UsuarioException';
import { esSuperAdmin } from '../../Domain/Constants/SuperAdmin';
import { SupabaseUsuarioRepository } from '../../Infrastructure/Repositories/SupabaseUsuarioRepository';
import { SupabaseAuditRepository } from '../../Infrastructure/Repositories/SupabaseAuditRepository';

export class DesactivarUsuario {
  constructor(
    private readonly usuarioRepo: IUsuarioRepository,
    private readonly auditRepo?: IAuditRepository
  ) {}

  async execute(id: string): Promise<void> {
    const idLimpio = id ? id.trim() : '';
    if (!idLimpio) {
      throw new DomainException('El identificador del usuario es obligatorio para desactivar');
    }

    const usuarioExistente = await this.usuarioRepo.obtenerPorId(idLimpio);
    if (!usuarioExistente) {
      throw new UsuarioNoEncontradoException(idLimpio);
    }

    if (esSuperAdmin(usuarioExistente.email)) {
      throw new DomainException('El usuario Super Administrador es un registro base del sistema y no puede ser desactivado.');
    }

    await this.usuarioRepo.desactivar(idLimpio);

    if (this.auditRepo) {
      this.auditRepo.registrarEvento({
        accion: 'BAJA_USUARIO',
        entidadAfectada: 'Usuarios',
        entidadId: idLimpio,
        detalle: `Baja lógica del usuario ${usuarioExistente.nombres} ${usuarioExistente.apellidos} (${usuarioExistente.email})`,
        resultado: 'Exito',
      }).catch(() => {});
    }
  }

  async ejecutar(id: string): Promise<void> {
    return this.execute(id);
  }
}

export const desactivarUsuarioUseCase = new DesactivarUsuario(
  new SupabaseUsuarioRepository(),
  new SupabaseAuditRepository()
);
