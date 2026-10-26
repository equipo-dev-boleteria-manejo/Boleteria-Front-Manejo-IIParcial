/**
 * SignUp.ts - Caso de Uso para Registro de Usuarios
 *
 * Aplica Inversión de Dependencias (DIP) y valida invariantes de negocio
 * utilizando el Value Object Cedula y la Entidad Usuario.
 */

import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository';
import { Usuario } from '../../Domain/Entities/Usuario';
import { Cedula } from '../../Domain/ValueObjects/Cedula';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { SupabaseAuthRepository } from '../../Infrastructure/Repositories/SupabaseAuthRepository';
import type { SignUpDto } from '../Dtos/SignUpDto';

export class SignUpUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(dto: SignUpDto): Promise<Usuario> {
    const emailNormalizado = dto.email ? dto.email.trim().toLowerCase() : '';
    const password = dto.password ? dto.password.trim() : '';
    const nombres = dto.nombres ? dto.nombres.trim() : '';
    const apellidos = dto.apellidos ? dto.apellidos.trim() : '';
    const rol = dto.rol ?? RolUsuario.CLIENTE;

    if (!emailNormalizado || !password || !nombres || !apellidos || !dto.cedula) {
      throw new DomainException('Todos los campos son obligatorios para el registro');
    }

    if (password.length < 8) {
      throw new DomainException('La contraseña debe contener al menos 8 caracteres');
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      throw new DomainException('La contraseña debe incluir mayúsculas, minúsculas y números');
    }

    // Instanciación del Value Object Cedula (garantiza validación Módulo 10 de Ecuador)
    const cedulaValida = new Cedula(dto.cedula);

    const nuevoUsuario = new Usuario(
      emailNormalizado,
      cedulaValida,
      nombres,
      apellidos,
      rol,
      true
    );

    if (dto.cooperativaId) {
      nuevoUsuario.cooperativaId = dto.cooperativaId;
    }

    return await this.authRepo.registrarse(nuevoUsuario, password);
  }

  async ejecutar(dto: SignUpDto): Promise<Usuario> {
    return this.execute(dto);
  }
}

export const signUpUseCase = new SignUpUseCase(new SupabaseAuthRepository());
