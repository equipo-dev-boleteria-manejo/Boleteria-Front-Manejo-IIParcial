/**
 * CrearUsuario.ts - Caso de Uso para Creación Administrativa de Usuarios
 *
 * Utilizado por administradores para dar de alta usuarios con roles específicos.
 */

import type { IUsuarioRepository } from '../../Domain/Repositories/IUsuarioRepository';
import { Usuario } from '../../Domain/Entities/Usuario';
import { Cedula } from '../../Domain/ValueObjects/Cedula';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { UsuarioException } from '../../Domain/Exceptions/UsuarioException';
import { SupabaseUsuarioRepository } from '../../Infrastructure/Repositories/SupabaseUsuarioRepository';
import type { CrearUsuarioDto } from '../Dtos/UsuarioDto';

export class CrearUsuario {
  constructor(private readonly usuarioRepo: IUsuarioRepository) {}

  async execute(dto: CrearUsuarioDto): Promise<Usuario> {
    const emailNormalizado = dto.email ? dto.email.trim().toLowerCase() : '';
    const nombres = dto.nombres ? dto.nombres.trim() : '';
    const apellidos = dto.apellidos ? dto.apellidos.trim() : '';

    if (!emailNormalizado || !dto.cedula || !nombres || !apellidos || !dto.rol) {
      throw new DomainException('Cédula, correo electrónico, nombres, apellidos y rol son obligatorios');
    }

    const usuarioPorEmail = await this.usuarioRepo.obtenerPorEmail(emailNormalizado);
    if (usuarioPorEmail) {
      throw new UsuarioException(`Ya existe un usuario registrado con el correo '${emailNormalizado}'`);
    }

    const cedulaLimpia = dto.cedula.trim();
    const usuarioPorCedula = await this.usuarioRepo.obtenerPorCedula(cedulaLimpia);
    if (usuarioPorCedula) {
      throw new UsuarioException(`Ya existe un usuario registrado con la cédula '${cedulaLimpia}'`);
    }

    const cedulaValida = new Cedula(cedulaLimpia);
    const nuevoUsuario = new Usuario(
      emailNormalizado,
      cedulaValida,
      nombres,
      apellidos,
      dto.rol,
      true
    );

    if (dto.cooperativaId) {
      nuevoUsuario.cooperativaId = dto.cooperativaId;
    }

    return await this.usuarioRepo.guardar(nuevoUsuario);
  }

  async ejecutar(dto: CrearUsuarioDto): Promise<Usuario> {
    return this.execute(dto);
  }
}

export const crearUsuarioUseCase = new CrearUsuario(new SupabaseUsuarioRepository());
