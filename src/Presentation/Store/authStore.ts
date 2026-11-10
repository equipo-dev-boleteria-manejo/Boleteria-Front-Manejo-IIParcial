import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { loginUseCase } from '../../Application/UseCases/Login';
import type { Usuario } from '../../Domain/Entities/Usuario';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';

export interface UserProfile {
  id: string;
  email: string;
  nombre?: string;
  nombres?: string;
  apellidos?: string;
  rol?: RolUsuario | string;
  cedula?: string;
  cooperativaId?: number | null;
}

const STORAGE_KEY = 'boleteria_auth_user_profile';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(null);
  const loading = ref(false);
  const error = ref('');
  const ready = ref(false);

  const isAuthenticated = computed(() => !!user.value);
  const role = computed(() => user.value?.rol || RolUsuario.CLIENTE);

  const mapUsuarioToProfile = (usuario: Usuario): UserProfile => {
    return {
      id: usuario.id || '',
      email: usuario.email,
      nombre: usuario.nombreCompleto,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      rol: usuario.rol,
      cedula: usuario.cedula?.valor,
      cooperativaId: usuario.cooperativaId,
    };
  };

  const login = async (email: string, password: string) => {
    loading.value = true;
    error.value = '';
    try {
      const sesion = await loginUseCase.execute({ email, password });
      user.value = mapUsuarioToProfile(sesion.usuario);
      return sesion;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error al iniciar sesión';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    loading.value = true;
    error.value = '';
    try {
      await loginUseCase.logout();
      user.value = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error al cerrar sesión';
    } finally {
      loading.value = false;
    }
  };

  const initializeAuth = async () => {
    loading.value = true;
    try {
      const currentUser = await loginUseCase.getCurrentUser();
      if (currentUser) {
        user.value = mapUsuarioToProfile(currentUser);
      } else {
        // Principio Fail-Closed: Sin sesión legítima en Supabase Auth, corte inmediato.
        // Se destruye cualquier perfil previo o servilleta en localStorage.
        user.value = null;
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      user.value = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } finally {
      loading.value = false;
      ready.value = true;
    }
  };

  return {
    user,
    loading,
    error,
    ready,
    isAuthenticated,
    role,
    login,
    logout,
    initializeAuth,
  };
});
