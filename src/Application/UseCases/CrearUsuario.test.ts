import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrearUsuario } from './CrearUsuario';
import type { IUsuarioRepository } from '../../Domain/Repositories/IUsuarioRepository';
import { Usuario } from '../../Domain/Entities/Usuario';
import { Cedula } from '../../Domain/ValueObjects/Cedula';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { UsuarioException } from '../../Domain/Exceptions/UsuarioException';

describe('CrearUsuario UseCase', () => {
  let mockUsuarioRepo: IUsuarioRepository;
  let useCase: CrearUsuario;
  let usuarioGuardado: Usuario;

  beforeEach(() => {
    usuarioGuardado = new Usuario(
      'chofer@boleteria.com',
      new Cedula('1710034065'),
      'Luis',
      'Morales',
      RolUsuario.CHOFER
    );
    usuarioGuardado.id = 'usr-uuid-chofer';

    mockUsuarioRepo = {
      obtenerPorId: vi.fn(),
      obtenerPorEmail: vi.fn().mockResolvedValue(null),
      obtenerPorCedula: vi.fn().mockResolvedValue(null),
      obtenerTodos: vi.fn(),
      guardar: vi.fn().mockResolvedValue(usuarioGuardado),
      actualizar: vi.fn(),
      desactivar: vi.fn(),
    };

    useCase = new CrearUsuario(mockUsuarioRepo);
  });

  it('debe crear y guardar un usuario con datos correctos', async () => {
    const input = {
      email: 'chofer@boleteria.com',
      cedula: '1710034065',
      nombres: 'Luis',
      apellidos: 'Morales',
      rol: RolUsuario.CHOFER,
      cooperativaId: 1,
    };

    const resultado = await useCase.execute(input);

    expect(resultado).toEqual(usuarioGuardado);
    expect(mockUsuarioRepo.guardar).toHaveBeenCalledTimes(1);
  });

  it('debe lanzar DomainException si faltan campos obligatorios', async () => {
    const inputIncompleto = {
      email: '',
      cedula: '1710034065',
      nombres: 'Luis',
      apellidos: 'Morales',
      rol: RolUsuario.CHOFER,
    };

    await expect(useCase.execute(inputIncompleto)).rejects.toThrow(DomainException);
  });

  it('debe lanzar UsuarioException si el correo ya se encuentra registrado', async () => {
    mockUsuarioRepo.obtenerPorEmail = vi.fn().mockResolvedValue(usuarioGuardado);

    const input = {
      email: 'chofer@boleteria.com',
      cedula: '1710034065',
      nombres: 'Luis',
      apellidos: 'Morales',
      rol: RolUsuario.CHOFER,
    };

    await expect(useCase.execute(input)).rejects.toThrow(UsuarioException);
    expect(mockUsuarioRepo.guardar).not.toHaveBeenCalled();
  });

  it('debe lanzar UsuarioException si la cédula ya se encuentra registrada', async () => {
    mockUsuarioRepo.obtenerPorCedula = vi.fn().mockResolvedValue(usuarioGuardado);

    const input = {
      email: 'otro@boleteria.com',
      cedula: '1710034065',
      nombres: 'Luis',
      apellidos: 'Morales',
      rol: RolUsuario.CHOFER,
    };

    await expect(useCase.execute(input)).rejects.toThrow(UsuarioException);
    expect(mockUsuarioRepo.guardar).not.toHaveBeenCalled();
  });

  it('debe registrar credenciales en IAuthRepository cuando se provee contraseña y authRepo', async () => {
    const mockAuthRepo = {
      iniciarSesion: vi.fn(),
      cerrarSesion: vi.fn(),
      obtenerUsuarioActual: vi.fn(),
      recuperarContrasenia: vi.fn(),
      registrarse: vi.fn().mockResolvedValue(usuarioGuardado),
    };

    const useCaseConAuth = new CrearUsuario(mockUsuarioRepo, mockAuthRepo);

    const input = {
      email: 'chofer@boleteria.com',
      cedula: '1710034065',
      nombres: 'Luis',
      apellidos: 'Morales',
      rol: RolUsuario.CHOFER,
      password: 'PasswordSeguro123',
    };

    const resultado = await useCaseConAuth.execute(input);

    expect(resultado).toEqual(usuarioGuardado);
    expect(mockAuthRepo.registrarse).toHaveBeenCalledWith(
      expect.any(Usuario),
      'PasswordSeguro123'
    );
    expect(mockUsuarioRepo.guardar).not.toHaveBeenCalled();
  });

  it('debe rechazar contraseña que no cumpla con las políticas de seguridad', async () => {
    const mockAuthRepo = {
      iniciarSesion: vi.fn(),
      cerrarSesion: vi.fn(),
      obtenerUsuarioActual: vi.fn(),
      recuperarContrasenia: vi.fn(),
      registrarse: vi.fn(),
    };

    const useCaseConAuth = new CrearUsuario(mockUsuarioRepo, mockAuthRepo);

    const inputInseguro = {
      email: 'chofer@boleteria.com',
      cedula: '1710034065',
      nombres: 'Luis',
      apellidos: 'Morales',
      rol: RolUsuario.CHOFER,
      password: 'debil',
    };

    await expect(useCaseConAuth.execute(inputInseguro)).rejects.toThrow(DomainException);
    expect(mockAuthRepo.registrarse).not.toHaveBeenCalled();
  });
});
