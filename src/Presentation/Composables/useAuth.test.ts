import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuth } from './useAuth';
import { SignUpUseCase } from '../../Application/UseCases/SignUp';
import { LoginUseCase } from '../../Application/UseCases/Login';
import { Usuario } from '../../Domain/Entities/Usuario';
import { Cedula } from '../../Domain/ValueObjects/Cedula';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';

describe('useAuth Composable', () => {
  let mockSignUpService: SignUpUseCase;
  let mockLoginService: LoginUseCase;
  let usuarioCreado: Usuario;

  beforeEach(() => {
    setActivePinia(createPinia());

    usuarioCreado = new Usuario(
      'gabriel@boleteria.com',
      new Cedula('1710034065'),
      'Gabriel',
      'Paredes',
      RolUsuario.CLIENTE
    );
    usuarioCreado.id = 'usr-123';

    mockSignUpService = {
      execute: vi.fn().mockResolvedValue(usuarioCreado),
      ejecutar: vi.fn(),
    } as unknown as SignUpUseCase;

    mockLoginService = {
      execute: vi.fn().mockResolvedValue({ usuario: usuarioCreado, token: 'token' }),
      ejecutar: vi.fn(),
      logout: vi.fn(),
      cerrarSesion: vi.fn(),
      getCurrentUser: vi.fn().mockResolvedValue(usuarioCreado),
      obtenerUsuarioActual: vi.fn(),
    } as unknown as LoginUseCase;
  });

  it('debe validar la cédula usando el algoritmo Módulo 10 ecuatoriano', () => {
    const composable = useAuth(mockSignUpService, mockLoginService);

    composable.cedula.value = '12345';
    expect(composable.validateCedula()).toBe(false);
    expect(composable.errorCedula.value).toContain('no es válida según el estándar ecuatoriano');

    composable.cedula.value = '1710034065';
    expect(composable.validateCedula()).toBe(true);
    expect(composable.errorCedula.value).toBe('');
  });

  it('debe validar los requisitos de complejidad de la contraseña', () => {
    const composable = useAuth(mockSignUpService, mockLoginService);

    composable.password.value = 'abc';
    expect(composable.completedRequirements.value).toBe(1); // solo minúsculas

    composable.password.value = 'PasswordSeguro123';
    expect(composable.completedRequirements.value).toBe(4);
  });

  it('debe registrar un nuevo usuario cuando isRegistering es true', async () => {
    const composable = useAuth(mockSignUpService, mockLoginService);
    composable.isRegistering.value = true;
    composable.email.value = 'gabriel@boleteria.com';
    composable.password.value = 'PasswordSeguro123';
    composable.nombres.value = 'Gabriel';
    composable.apellidos.value = 'Paredes';
    composable.cedula.value = '1710034065';

    await composable.handleAuthSubmit();

    expect(mockSignUpService.execute).toHaveBeenCalledTimes(1);
    expect(composable.mensajeExito.value).toContain('¡Cuenta registrada con éxito!');
    expect(composable.isRegistering.value).toBe(false);
  });
});
