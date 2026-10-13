import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../../Infrastructure/Api/supabaseClient'

export interface UserProfile {
  id: string
  email: string
  nombre?: string
  rol?: string
  cedula?: string
  cooperativaId?: number | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(null)
  const loading = ref(false)
  const error = ref('')
  const ready = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => user.value?.rol || 'cliente')

  const login = async (email: string, _password: string) => {
    loading.value = true
    error.value = ''
    try {
      // Mock inicial para permitir navegación y pruebas en la semilla base
      user.value = {
        id: 'usr-1',
        email,
        nombre: 'Usuario Demo',
        rol: email.includes('admin') ? 'admin' : email.includes('oficina') ? 'oficinista' : email.includes('chofer') ? 'chofer' : 'cliente',
      }
    } catch (err: any) {
      error.value = err.message || 'Error al iniciar sesión'
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    user.value = null
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignorar error al cerrar sesión en mock
    }
  }

  const initializeAuth = async () => {
    ready.value = true
  }

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
  }
})
