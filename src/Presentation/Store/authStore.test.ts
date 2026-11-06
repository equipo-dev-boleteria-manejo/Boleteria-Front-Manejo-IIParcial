import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from './authStore';
import { loginUseCase } from '../../Application/UseCases/Login';
import { Usuario } from '../../Domain/Entities/Usuario';
import { Cedula } from '../../Domain/ValueObjects/Cedula';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';

vi.mock('../../Application/UseCases/Login', () => ({
  loginUseCase: {
    execute: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

(globalThis as any).window = globalThis;
(globalThis as any).localStorage = localStorageMock;

describe('authStore - Protección contra falsificación de perfil (La Servilleta)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('NO debe confiar en el perfil inyectado en localStorage si Supabase no tiene sesión activa', async () => {
    // Simulamos un atacante inyectando un perfil de admin en localStorage
    const perfilFalso = {
      id: 'fake-hacker-id',
      email: 'hacker@malicioso.com',
      rol: 'admin',
      nombres: 'Hacker',
      apellidos: 'Admin',
    };
    localStorage.setItem('boleteria_auth_user_profile', JSON.stringify(perfilFalso));

    // Supabase Auth indica que NO hay sesión activa (currentUser es null)
    vi.mocked(loginUseCase.getCurrentUser).mockResolvedValue(null);

    const store = useAuthStore();
    await store.initializeAuth();

    // Verificamos que el store rechaza la servilleta: no autenticado, usuario null, servilleta destruida
    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
    expect(store.role).toBe(RolUsuario.CLIENTE);
    expect(localStorage.getItem('boleteria_auth_user_profile')).toBeNull();
  });

  it('debe autenticar y setear el perfil si Supabase Auth confirma una sesión legítima', async () => {
    const usuarioReal = new Usuario(
      'admin@transporte.ec',
      new Cedula('1710034065'),
      'Admin',
      'Principal',
      RolUsuario.ADMIN
    );
    usuarioReal.id = 'usr-real-uuid';

    vi.mocked(loginUseCase.getCurrentUser).mockResolvedValue(usuarioReal);

    const store = useAuthStore();
    await store.initializeAuth();

    expect(store.isAuthenticated).toBe(true);
    expect(store.user?.email).toBe('admin@transporte.ec');
    expect(store.role).toBe(RolUsuario.ADMIN);
  });

  it('debe limpiar el estado y destruir cualquier residuo en localStorage al cerrar sesión', async () => {
    const usuarioReal = new Usuario(
      'admin@transporte.ec',
      new Cedula('1710034065'),
      'Admin',
      'Principal',
      RolUsuario.ADMIN
    );
    usuarioReal.id = 'usr-real-uuid';

    vi.mocked(loginUseCase.execute).mockResolvedValue({
      usuario: usuarioReal,
      token: 'valid-jwt',
    });
    vi.mocked(loginUseCase.logout).mockResolvedValue(undefined);

    const store = useAuthStore();
    await store.login('admin@transporte.ec', 'PasswordSeguro123');

    expect(store.isAuthenticated).toBe(true);

    await store.logout();

    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
    expect(localStorage.getItem('boleteria_auth_user_profile')).toBeNull();
  });
});
