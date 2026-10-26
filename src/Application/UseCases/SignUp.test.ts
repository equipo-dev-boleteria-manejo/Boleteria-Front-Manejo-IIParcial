import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignUpUseCase } from './SignUp';
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository';
import { Usuario } from '../../Domain/Entities/Usuario';
import { Cedula } from '../../Domain/ValueObjects/Cedula';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { InvalidCedulaException } from '../../Domain/Exceptions/InvalidCedulaException';

describe('SignUpUseCase', () => {
  let mockAuthRepo: IAuthRepository;
  let useCase: SignUpUseCase;
  let usuarioRetornado: Usuario;

  beforeEach(() => {
    usuarioRetornado = new Usuario(
      'gabriel@boleteria.com',
      new Cedula('1710034065'),
      'Gabriel',
      'Paredes',
      RolUsuario.CLIENTE
    );
    usuarioRetornado.id = 'usr-uuid-nuevo';

    mockAuthRepo = {
      iniciarSesion: vi.fn(),
      cerrarSesion: vi.fn(),
      obtenerUsuarioActual: vi.fn(),
      recuperarContrasenia: vi.fn(),
      registrarse: vi.fn().mockResolvedValue(usuarioRetornado),
    };

    useCase = new SignUpUseCase(mockAuthRepo);
  });

  it('debe registrar un usuario exitosamente con datos válidos', async () => {
    const input = {
      email: 'Gabriel@Boleteria.com',
      password: 'PasswordSeguro123',
      cedula: '1710034065',
      nombres: 'Gabriel',
      apellidos: 'Paredes',
    };

    const resultado = await useCase.execute(input);

    expect(resultado).toEqual(usuarioRetornado);
    expect(mockAuthRepo.registrarse).toHaveBeenCalledTimes(1);
    const usuarioEnviado = (mockAuthRepo.registrarse as any).mock.calls[0][0];
    expect(usuarioEnviado.email).toBe('gabriel@boleteria.com');
    expect(usuarioEnviado.cedula.valor).toBe('1710034065');
  });

  it('debe lanzar DomainException si falta algún campo obligatorio', async () => {
    const inputIncompleto = {
      email: '',
      password: 'PasswordSeguro123',
      cedula: '1710034065',
      nombres: 'Gabriel',
      apellidos: 'Paredes',
    };

    await expect(useCase.execute(inputIncompleto)).rejects.toThrow(
      'Todos los campos son obligatorios para el registro'
    );
  });

  it('debe lanzar DomainException si la contraseña tiene menos de 8 caracteres', async () => {
    const inputPassCorta = {
      email: 'gabriel@boleteria.com',
      password: 'Pass1',
      cedula: '1710034065',
      nombres: 'Gabriel',
      apellidos: 'Paredes',
    };

    await expect(useCase.execute(inputPassCorta)).rejects.toThrow(
      'La contraseña debe contener al menos 8 caracteres'
    );
  });

  it('debe lanzar DomainException si la contraseña no cumple la complejidad requerida', async () => {
    const inputPassSimple = {
      email: 'gabriel@boleteria.com',
      password: 'sololetrasminusculas',
      cedula: '1710034065',
      nombres: 'Gabriel',
      apellidos: 'Paredes',
    };

    await expect(useCase.execute(inputPassSimple)).rejects.toThrow(
      'La contraseña debe incluir mayúsculas, minúsculas y números'
    );
  });

  it('debe lanzar InvalidCedulaException si la cédula no cumple con la validación de Módulo 10', async () => {
    const inputCedulaInvalida = {
      email: 'gabriel@boleteria.com',
      password: 'PasswordSeguro123',
      cedula: '1234567890',
      nombres: 'Gabriel',
      apellidos: 'Paredes',
    };

    await expect(useCase.execute(inputCedulaInvalida)).rejects.toThrow(
      InvalidCedulaException
    );
  });
});
