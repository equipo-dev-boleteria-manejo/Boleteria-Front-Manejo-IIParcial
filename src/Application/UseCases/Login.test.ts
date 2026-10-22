import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginUseCase } from './Login';
import type { IAuthRepository, SesionAuth } from '../../Domain/Repositories/IAuthRepository';
import { Usuario } from '../../Domain/Entities/Usuario';
import { Cedula } from '../../Domain/ValueObjects/Cedula';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { CredencialesInvalidasException } from '../../Domain/Exceptions/UsuarioException';

describe('LoginUseCase (Golden Standard)', () => {
  let mockAuthRepo: IAuthRepository;
  let useCase: LoginUseCase;
  let usuarioValido: Usuario;
  let sesionValida: SesionAuth;

  beforeEach(() => {
    usuarioValido = new Usuario(
      'carlos@boleteria.com',
      new Cedula('1710034065'),
      'Carlos',
      'Mendoza',
      RolUsuario.ADMIN
    );
    usuarioValido.id = 'usr-uuid-1';

    sesionValida = {
      usuario: usuarioValido,
      token: 'jwt-mock-token-xyz',
    };

    mockAuthRepo = {
      iniciarSesion: vi.fn().mockResolvedValue(sesionValida),
      cerrarSesion: vi.fn().mockResolvedValue(undefined),
      obtenerUsuarioActual: vi.fn().mockResolvedValue(usuarioValido),
      recuperarContrasenia: vi.fn().mockResolvedValue(undefined),
      registrarse: vi.fn().mockResolvedValue(usuarioValido),
    };

    useCase = new LoginUseCase(mockAuthRepo);
  });

  it('debe iniciar sesión exitosamente con credenciales válidas y normalizar el email', async () => {
    const input = {
      email: '  CARLOS@Boleteria.com  ',
      password: 'MiPasswordSeguro123',
    };

    const resultado = await useCase.execute(input);

    expect(resultado).toEqual(sesionValida);
    expect(resultado.usuario.email).toBe('carlos@boleteria.com');
    expect(mockAuthRepo.iniciarSesion).toHaveBeenCalledTimes(1);
    expect(mockAuthRepo.iniciarSesion).toHaveBeenCalledWith(
      'carlos@boleteria.com',
      'MiPasswordSeguro123'
    );
  });

  it('debe funcionar de forma idéntica con el alias ejecutar()', async () => {
    const resultado = await useCase.ejecutar({
      email: 'carlos@boleteria.com',
      password: 'MiPasswordSeguro123',
    });

    expect(resultado).toEqual(sesionValida);
    expect(mockAuthRepo.iniciarSesion).toHaveBeenCalledWith(
      'carlos@boleteria.com',
      'MiPasswordSeguro123'
    );
  });

  it('debe lanzar DomainException si el correo está vacío', async () => {
    await expect(
      useCase.execute({ email: '   ', password: 'secretPassword' })
    ).rejects.toThrow(DomainException);

    await expect(
      useCase.execute({ email: '   ', password: 'secretPassword' })
    ).rejects.toThrow('El correo electrónico y la contraseña son requeridos');

    expect(mockAuthRepo.iniciarSesion).not.toHaveBeenCalled();
  });

  it('debe lanzar DomainException si la contraseña está vacía', async () => {
    await expect(
      useCase.execute({ email: 'carlos@boleteria.com', password: '' })
    ).rejects.toThrow(DomainException);

    expect(mockAuthRepo.iniciarSesion).not.toHaveBeenCalled();
  });

  it('debe lanzar DomainException si el formato de correo es inválido', async () => {
    await expect(
      useCase.execute({ email: 'correo-sin-arroba.com', password: 'validPassword' })
    ).rejects.toThrow('El formato del correo electrónico no es válido');

    expect(mockAuthRepo.iniciarSesion).not.toHaveBeenCalled();
  });

  it('debe propagar CredencialesInvalidasException cuando el repositorio rechaza las credenciales', async () => {
    mockAuthRepo.iniciarSesion = vi.fn().mockRejectedValue(new CredencialesInvalidasException());

    await expect(
      useCase.execute({ email: 'carlos@boleteria.com', password: 'wrongPassword' })
    ).rejects.toThrow(CredencialesInvalidasException);

    expect(mockAuthRepo.iniciarSesion).toHaveBeenCalledTimes(1);
  });

  it('debe cerrar la sesión llamando a cerrarSesion() del repositorio', async () => {
    await useCase.logout();
    expect(mockAuthRepo.cerrarSesion).toHaveBeenCalledTimes(1);

    await useCase.cerrarSesion();
    expect(mockAuthRepo.cerrarSesion).toHaveBeenCalledTimes(2);
  });

  it('debe obtener el usuario actual mediante getCurrentUser()', async () => {
    const usuario = await useCase.getCurrentUser();
    expect(usuario).toEqual(usuarioValido);
    expect(mockAuthRepo.obtenerUsuarioActual).toHaveBeenCalledTimes(1);
  });
});
