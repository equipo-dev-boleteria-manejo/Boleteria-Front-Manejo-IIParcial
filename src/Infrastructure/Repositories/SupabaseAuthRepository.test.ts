import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseAuthRepository } from './SupabaseAuthRepository';
import { CredencialesInvalidasException } from '../../Domain/Exceptions/UsuarioException';
import { supabase, authIsolatedClient } from '../Api/supabaseClient';

vi.mock('../Api/supabaseClient', () => {
  return {
    supabase: {
      auth: {
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      },
      from: vi.fn(),
    },
    authIsolatedClient: {
      auth: {
        signUp: vi.fn(),
      },
    },
  };
});

describe('SupabaseAuthRepository - Seguridad e inicio de sesión', () => {
  let repository: SupabaseAuthRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new SupabaseAuthRepository();
  });

  it('debe frenar en seco y lanzar CredencialesInvalidasException cuando Supabase Auth rechaza la contraseña, aun con password de >= 8 caracteres y perfil existente', async () => {
    // Simulamos que el Identity Provider rechaza la contraseña (credenciales inválidas)
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { name: 'AuthApiError', message: 'Invalid login credentials', status: 400 } as any,
    });

    // Simulamos que en la BD sí existe un perfil activo para esa cuenta
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        Id: 'usr-real-uuid',
        Email: 'victima@transporte.ec',
        Cedula: '1710034065',
        Nombres: 'Juan',
        Apellidos: 'Perez',
        Rol: 'cliente',
        Activo: true,
      },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    } as any);

    // Intentamos el exploit: contraseña de 12 caracteres ('churrasco123')
    await expect(
      repository.iniciarSesion('victima@transporte.ec', 'churrasco123')
    ).rejects.toThrow(CredencialesInvalidasException);

    // Verificamos que jamás se consultó la BD para otorgar acceso si la autenticación falló
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('debe otorgar la sesión con el token real de Supabase cuando las credenciales son válidas', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: {
        user: { id: 'usr-real-uuid', email: 'usuario@transporte.ec' } as any,
        session: { access_token: 'jwt-real-firmado-por-supabase' } as any,
      },
      error: null,
    });

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        Id: 'usr-real-uuid',
        Email: 'usuario@transporte.ec',
        Cedula: '1710034065',
        Nombres: 'Juan',
        Apellidos: 'Perez',
        Rol: 'cliente',
        Activo: true,
      },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    } as any);

    const sesion = await repository.iniciarSesion('usuario@transporte.ec', 'MiPasswordCorrecto123');

    expect(sesion.token).toBe('jwt-real-firmado-por-supabase');
    expect(sesion.usuario.email).toBe('usuario@transporte.ec');
  });

  it('no debe tener puertas traseras para el SuperAdmin: debe autenticar contra Supabase Auth y rechazar claves hardcodeadas si Auth falla', async () => {
    // Simulamos que Supabase Auth rechaza el intento, incluso si alguien intenta la clave vieja hardcodeada
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { name: 'AuthApiError', message: 'Invalid login credentials', status: 400 } as any,
    });

    await expect(
      repository.iniciarSesion('admin@transporte.ec', 'Admin1234*')
    ).rejects.toThrow(CredencialesInvalidasException);

    // Debe llamar a Supabase Auth sin saltárselo
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'admin@transporte.ec',
      password: 'Admin1234*',
    });
  });

  it('debe fallar el registro y NO insertar en la tabla Usuarios si Supabase Auth signUp falla', async () => {
    // 1. Simular que no existe previo en Usuarios
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockInsert = vi.fn();

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
        eq: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      }),
      insert: mockInsert,
    } as any);

    // 2. Simular que Supabase Auth signUp falla (ej. rate-limit o correo no permitido)
    vi.mocked(authIsolatedClient.auth.signUp as any).mockResolvedValue({
      data: { user: null },
      error: { name: 'AuthApiError', message: 'Email rate limit exceeded', status: 429 },
    });
    vi.mocked(supabase.auth.signUp as any).mockResolvedValue({
      data: { user: null },
      error: { name: 'AuthApiError', message: 'Email rate limit exceeded', status: 429 },
    });

    const nuevoUsuario = {
      email: 'nuevo@transporte.ec',
      cedula: { valor: '1710034065' },
      nombres: 'Nuevo',
      apellidos: 'Usuario',
      rol: 'cliente',
      activo: true,
      cooperativaId: null,
    } as any;

    await expect(
      repository.registrarse(nuevoUsuario, 'PasswordSeguro123')
    ).rejects.toThrow('Error al registrar credenciales en el proveedor de autenticación');

    // Comprobar que NUNCA se llamó a insert para crear un perfil huérfano
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
