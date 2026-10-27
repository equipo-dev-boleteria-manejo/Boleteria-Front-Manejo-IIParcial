/**
 * ActualizarUsuario.ts - Caso de Uso para Modificación de Perfiles de Usuario
 */

import type { IUsuarioRepository } from '../../Domain/Repositories/IUsuarioRepository';
import type { Usuario } from '../../Domain/Entities/Usuario';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { UsuarioNoEncontradoException } from '../../Domain/Exceptions/UsuarioException';
import { esSuperAdmin } from '../../Domain/Constants/SuperAdmin';
import { SupabaseUsuarioRepository } from '../../Infrastructure/Repositories/SupabaseUsuarioRepository';
import type { ActualizarUsuarioDto } from '../Dtos/UsuarioDto';

export class ActualizarUsuario {
  constructor(private readonly usuarioRepo: IUsuarioRepository) {}

  async execute(dto: ActualizarUsuarioDto): Promise<Usuario> {
    if (!dto.id) {
      throw new DomainException('El identificador del usuario es obligatorio para actualizar');
    }

    const nombres = dto.nombres ? dto.nombres.trim() : '';
    const apellidos = dto.apellidos ? dto.apellidos.trim() : '';

    if (!nombres || !apellidos || !dto.rol) {
      throw new DomainException('Nombres, apellidos y rol son obligatorios');
    }

    const usuarioExistente = await this.usuarioRepo.obtenerPorId(dto.id);
    if (!usuarioExistente) {
      throw new UsuarioNoEncontradoException(dto.id);
    }

    // Regla de inmutabilidad del Super Administrador
    if (esSuperAdmin(usuarioExistente.email)) {
      if (dto.activo === false) {
        throw new DomainException('El Super Administrador no puede ser desactivado.');
      }
      if (!dto.rol.toLowerCase().includes('admin')) {
        throw new DomainException('No se puede revocar el rol de Administrador al Super Administrador.');
      }
    }

    usuarioExistente.nombres = nombres;
    usuarioExistente.apellidos = apellidos;
    usuarioExistente.rol = dto.rol;

    if (dto.cooperativaId !== undefined) {
      usuarioExistente.cooperativaId = dto.cooperativaId;
    }

    if (dto.activo !== undefined) {
      usuarioExistente.activo = dto.activo;
    }

    return await this.usuarioRepo.actualizar(usuarioExistente);
  }

  async ejecutar(dto: ActualizarUsuarioDto): Promise<Usuario> {
    return this.execute(dto);
  }
}

export const actualizarUsuarioUseCase = new ActualizarUsuario(new SupabaseUsuarioRepository());
