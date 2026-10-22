/**
 * useLogin.ts - Composable Canónico de Autenticación (Golden Standard)
 *
 * Arquitectura:
 * - Lógica de presentación reactiva desacoplada (Headless).
 * - No contiene HTML, CSS ni acoplamiento a vistas específicas.
 * - Gestiona el estado reactivo (loading, error, sesion) y orquesta el LoginUseCase.
 */

import { ref, computed } from 'vue';
import type { SesionAuth } from '../../Domain/Repositories/IAuthRepository';
import type { Usuario } from '../../Domain/Entities/Usuario';
import { LoginUseCase, loginUseCase as defaultLoginUseCase } from '../../Application/UseCases/Login';

export function useLogin(useCase: LoginUseCase = defaultLoginUseCase) {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const sesion = ref<SesionAuth | null>(null);

  const isAuthenticated = computed(() => !!sesion.value);
  const user = computed<Usuario | null>(() => sesion.value?.usuario ?? null);

  /**
   * Inicia sesión invocando el caso de uso y actualizando el estado reactivo.
   */
  async function login(email: string, password: string): Promise<SesionAuth> {
    loading.value = true;
    error.value = null;

    try {
      const resultado = await useCase.execute({ email, password });
      sesion.value = resultado;
      return resultado;
    } catch (err: any) {
      error.value = err.message || 'Error al iniciar sesión';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Cierra la sesión activa y limpia el estado local.
   */
  async function logout(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await useCase.logout();
      sesion.value = null;
    } catch (err: any) {
      error.value = err.message || 'Error al cerrar sesión';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Verifica si existe una sesión activa y la carga en el estado reactivo.
   */
  async function checkCurrentUser(): Promise<Usuario | null> {
    loading.value = true;
    error.value = null;

    try {
      const usuario = await useCase.getCurrentUser();
      if (usuario) {
        sesion.value = { usuario };
      } else {
        sesion.value = null;
      }
      return usuario;
    } catch (err: any) {
      error.value = err.message || 'Error al verificar sesión';
      return null;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    sesion,
    isAuthenticated,
    user,
    login,
    logout,
    checkCurrentUser,
  };
}
