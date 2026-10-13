<template>
  <div class="max-w-md mx-auto mt-12 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
    <div class="text-center mb-6">
      <div class="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center mx-auto mb-3">
        B
      </div>
      <h2 class="text-xl font-black text-slate-900">Iniciar Sesión</h2>
      <p class="text-xs text-slate-500 mt-1">Ingresa tus credenciales para acceder a la boletería.</p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Correo Electrónico</label>
        <input
          v-model="email"
          type="email"
          required
          placeholder="ejemplo@transporte.ec"
          class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Contraseña</label>
        <input
          v-model="password"
          type="password"
          required
          placeholder="••••••••"
          class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
      </div>

      <div v-if="authStore.error" class="p-3 rounded-lg bg-red-50 text-red-600 text-xs font-semibold">
        {{ authStore.error }}
      </div>

      <button
        type="submit"
        :disabled="authStore.loading"
        class="w-full py-2.5 px-4 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50"
      >
        {{ authStore.loading ? 'Accediendo...' : 'Ingresar' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../Store/authStore'

const email = ref('')
const password = ref('')
const authStore = useAuthStore()
const router = useRouter()

const handleSubmit = async () => {
  try {
    await authStore.login(email.value, password.value)
    router.push('/')
  } catch {
    // Error handled in store
  }
}
</script>
