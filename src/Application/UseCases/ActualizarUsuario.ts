/**
 * ActualizarUsuario.ts - Caso de Uso para Modificación de Perfiles de Usuario
 */

import type { IUsuarioRepository } from '../../Domain/Repositories/IUsuarioRepository';
import type { Usuario } from '../../Domain/Entities/Usuario';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { UsuarioNoEncontradoException } from '../../Domain/Exceptions/UsuarioException';
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
