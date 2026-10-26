/**
 * DesactivarUsuario.ts - Caso de Uso para Baja Lógica de Usuarios
 */

import type { IUsuarioRepository } from '../../Domain/Repositories/IUsuarioRepository';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { UsuarioNoEncontradoException } from '../../Domain/Exceptions/UsuarioException';
import { SupabaseUsuarioRepository } from '../../Infrastructure/Repositories/SupabaseUsuarioRepository';

export class DesactivarUsuario {
  constructor(private readonly usuarioRepo: IUsuarioRepository) {}

  async execute(id: string): Promise<void> {
    const idLimpio = id ? id.trim() : '';
    if (!idLimpio) {
      throw new DomainException('El identificador del usuario es obligatorio para desactivar');
    }

    const usuarioExistente = await this.usuarioRepo.obtenerPorId(idLimpio);
    if (!usuarioExistente) {
      throw new UsuarioNoEncontradoException(idLimpio);
    }

    await this.usuarioRepo.desactivar(idLimpio);
  }

  async ejecutar(id: string): Promise<void> {
    return this.execute(id);
  }
}

export const desactivarUsuarioUseCase = new DesactivarUsuario(new SupabaseUsuarioRepository());
