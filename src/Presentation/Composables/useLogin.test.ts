import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLogin } from './useLogin';
import { LoginUseCase } from '../../Application/UseCases/Login';
import type { IAuthRepository, SesionAuth } from '../../Domain/Repositories/IAuthRepository';
import { Usuario } from '../../Domain/Entities/Usuario';
import { Cedula } from '../../Domain/ValueObjects/Cedula';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';

describe('useLogin Composable (Golden Standard)', () => {
  let mockAuthRepo: IAuthRepository;
  let useCase: LoginUseCase;
  let usuarioValido: Usuario;
  let sesionValida: SesionAuth;

  beforeEach(() => {
    usuarioValido = new Usuario(
      'maria@boleteria.com',
      new Cedula('1710034065'),
      'Maria',
      'Lopez',
      RolUsuario.CLIENTE
    );
    usuarioValido.id = 'usr-uuid-2';

    sesionValida = {
      usuario: usuarioValido,
      token: 'jwt-token-123',
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

  it('debe iniciar con estado por defecto limpio', () => {
    const { loading, error, sesion, isAuthenticated, user } = useLogin(useCase);

    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(sesion.value).toBeNull();
    expect(isAuthenticated.value).toBe(false);
    expect(user.value).toBeNull();
  });

  it('debe actualizar loading, sesion e isAuthenticated al iniciar sesión con éxito', async () => {
    const { loading, error, sesion, isAuthenticated, user, login } = useLogin(useCase);

    const promesaLogin = login('maria@boleteria.com', 'passwordSeguro');
    expect(loading.value).toBe(true);

    const resultado = await promesaLogin;

    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(resultado).toEqual(sesionValida);
    expect(sesion.value).toEqual(sesionValida);
    expect(isAuthenticated.value).toBe(true);
    expect(user.value?.email).toBe('maria@boleteria.com');
  });

  it('debe capturar el error y resetear loading al fallar el login', async () => {
    mockAuthRepo.iniciarSesion = vi.fn().mockRejectedValue(new Error('Credenciales inválidas'));
    const { loading, error, sesion, isAuthenticated, login } = useLogin(useCase);

    await expect(login('maria@boleteria.com', 'wrongPass')).rejects.toThrow('Credenciales inválidas');

    expect(loading.value).toBe(false);
    expect(error.value).toBe('Credenciales inválidas');
    expect(sesion.value).toBeNull();
    expect(isAuthenticated.value).toBe(false);
  });

  it('debe limpiar la sesión y el usuario al ejecutar logout()', async () => {
    const { sesion, isAuthenticated, login, logout } = useLogin(useCase);

    await login('maria@boleteria.com', 'passwordSeguro');
    expect(isAuthenticated.value).toBe(true);

    await logout();

    expect(sesion.value).toBeNull();
    expect(isAuthenticated.value).toBe(false);
    expect(mockAuthRepo.cerrarSesion).toHaveBeenCalledTimes(1);
  });

  it('debe cargar el usuario en el estado al ejecutar checkCurrentUser()', async () => {
    const { sesion, user, checkCurrentUser } = useLogin(useCase);

    const usuario = await checkCurrentUser();

    expect(usuario).toEqual(usuarioValido);
    expect(sesion.value?.usuario).toEqual(usuarioValido);
    expect(user.value?.email).toBe('maria@boleteria.com');
  });
});
