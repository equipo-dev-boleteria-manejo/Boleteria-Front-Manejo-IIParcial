<template>
  <main class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 py-8 flex items-center justify-center">
    <div class="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] w-full">

      <!-- Columna Informativa de Marca -->
      <aside class="hidden rounded-[2.5rem] bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-10 lg:p-12 text-white shadow-2xl lg:flex flex-col justify-between h-full min-h-[580px]">
        <div>
          <div class="mb-8 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold tracking-wide backdrop-blur border border-white/20">
            <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Cooperativas Interprovinciales del Ecuador
          </div>
          <h1 class="text-4xl xl:text-5xl font-black leading-tight tracking-tight">
            Gestión inteligente de pasajes y frecuencias de transporte.
          </h1>
          <p class="mt-5 text-blue-100 text-sm leading-relaxed max-w-md">
            Portal oficial diseñado con Arquitectura Limpia, validación matemática de cédula ecuatoriana y control de acceso basado en roles (RBAC).
          </p>
        </div>

        <div class="space-y-4 pt-8">
          <div class="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur shadow-sm">
            <p class="font-bold text-sm">Control Operativo Integral</p>
            <p class="text-xs text-blue-100 mt-1">Supervisión en tiempo real de flota, bitácoras de viaje y abordaje mediante código QR.</p>
          </div>
          <div class="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur shadow-sm">
            <p class="font-bold text-sm">Tarifas Transparentes por Ley</p>
            <p class="text-xs text-blue-100 mt-1">Descuentos automatizados para menores, adultos mayores y personas con discapacidad.</p>
          </div>
        </div>
      </aside>

      <!-- Formulario de Acceso / Registro -->
      <section class="mx-auto w-full max-w-md">
        <div class="mb-6 flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 font-black text-white text-xl shadow-lg shadow-blue-500/30">
            B
          </div>
          <div>
            <h2 class="font-black text-slate-900 text-base leading-tight">Boletería Front</h2>
            <p class="text-xs text-slate-500 font-medium">Terminales Terrestres del Ecuador</p>
          </div>
        </div>

        <div class="rounded-[2.5rem] border border-white/80 bg-white/95 p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
          <div class="mb-6">
            <h2 class="text-2xl sm:text-3xl font-black text-slate-950">
              {{ isRegistering ? 'Crear cuenta' : 'Iniciar sesión' }}
            </h2>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">
              {{ isRegistering ? 'Regístrate para comprar pasajes y gestionar tus boletos.' : 'Ingresa tus credenciales para acceder a la plataforma.' }}
            </p>
          </div>

          <!-- Selector de Modo -->
          <nav class="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-xs font-bold" aria-label="Modo de autenticación">
            <button
              type="button"
              @click="toggleMode(false)"
              class="py-2.5 rounded-xl transition-all"
              :class="!isRegistering ? 'bg-white text-blue-700 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'"
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              @click="toggleMode(true)"
              class="py-2.5 rounded-xl transition-all"
              :class="isRegistering ? 'bg-white text-blue-700 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'"
            >
              Registrarse
            </button>
          </nav>

          <!-- Banner de Errores Globales -->
          <div
            v-if="globalError"
            class="mb-5 rounded-2xl bg-red-50 p-4 text-xs text-red-700 border border-red-200 font-semibold flex items-start gap-2.5"
            role="alert"
          >
            <span class="text-base shrink-0">⚠️</span>
            <span>{{ globalError }}</span>
          </div>

          <!-- Banner de Éxito -->
          <div
            v-if="mensajeExito"
            class="mb-5 rounded-2xl bg-emerald-50 p-4 text-xs text-emerald-800 border border-emerald-200 font-semibold flex items-start gap-2.5"
            role="status"
          >
            <span class="text-base shrink-0">✅</span>
            <span>{{ mensajeExito }}</span>
          </div>

          <form @submit.prevent="submit" class="space-y-4">
            <!-- Campos específicos de Registro -->
            <template v-if="isRegistering">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="block text-xs font-bold text-slate-700">Nombres</label>
                  <input
                    v-model="nombres"
                    @blur="validateNombres"
                    type="text"
                    required
                    placeholder="Ej. Juan Carlos"
                    class="w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    :class="errorNombres ? 'border-red-400 bg-red-50/50' : 'border-slate-200'"
                  />
                  <p v-if="errorNombres" class="text-[11px] font-bold text-red-600">{{ errorNombres }}</p>
                </div>

                <div class="space-y-1">
                  <label class="block text-xs font-bold text-slate-700">Apellidos</label>
                  <input
                    v-model="apellidos"
                    @blur="validateApellidos"
                    type="text"
                    required
                    placeholder="Ej. Pérez Gómez"
                    class="w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    :class="errorApellidos ? 'border-red-400 bg-red-50/50' : 'border-slate-200'"
                  />
                  <p v-if="errorApellidos" class="text-[11px] font-bold text-red-600">{{ errorApellidos }}</p>
                </div>
              </div>

              <div class="space-y-1">
                <label class="block text-xs font-bold text-slate-700">Cédula Ecuatoriana (10 dígitos)</label>
                <input
                  v-model="cedula"
                  @blur="validateCedula"
                  type="text"
                  maxlength="10"
                  required
                  placeholder="Ej. 1710034065"
                  class="w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-mono"
                  :class="errorCedula ? 'border-red-400 bg-red-50/50' : 'border-slate-200'"
                />
                <p v-if="errorCedula" class="text-[11px] font-bold text-red-600">{{ errorCedula }}</p>
              </div>
            </template>

            <!-- Email -->
            <div class="space-y-1">
              <label class="block text-xs font-bold text-slate-700">Correo Electrónico</label>
              <input
                v-model="email"
                @blur="validateEmail"
                type="email"
                required
                autocomplete="email"
                placeholder="usuario@transporte.ec"
                class="w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                :class="errorEmail ? 'border-red-400 bg-red-50/50' : 'border-slate-200'"
              />
              <p v-if="errorEmail" class="text-[11px] font-bold text-red-600">{{ errorEmail }}</p>
            </div>

            <!-- Contraseña -->
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-bold text-slate-700">Contraseña</label>
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                >
                  {{ showPassword ? 'Ocultar' : 'Ver contraseña' }}
                </button>
              </div>
              <div class="relative">
                <input
                  v-model="password"
                  @blur="validatePassword"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  :class="errorPassword ? 'border-red-400 bg-red-50/50' : 'border-slate-200'"
                />
              </div>
              <p v-if="errorPassword" class="text-[11px] font-bold text-red-600">{{ errorPassword }}</p>

              <!-- Requisitos de Contraseña en Registro -->
              <div v-if="isRegistering" class="mt-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-blue-600 transition-all duration-300"
                    :style="{ width: `${(completedRequirements / 4) * 100}%` }"
                  ></div>
                </div>
                <ul class="grid grid-cols-2 gap-1.5 text-[10px] text-slate-600">
                  <li
                    v-for="req in passwordRequirements"
                    :key="req.label"
                    class="flex items-center gap-1.5"
                    :class="req.isValid ? 'text-emerald-700 font-bold' : 'text-slate-500'"
                  >
                    <span>{{ req.isValid ? '✓' : '•' }}</span>
                    <span>{{ req.label }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Botón Submit -->
            <button
              :disabled="loading || cooldownActive"
              type="submit"
              class="w-full rounded-2xl bg-blue-600 py-3.5 px-4 font-black text-white text-sm shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              <span v-if="loading" class="inline-flex items-center gap-2">
                <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando solicitud...
              </span>
              <span v-else>
                {{ isRegistering ? 'Crear Cuenta Segura' : 'Ingresar a la Plataforma' }}
              </span>
            </button>
          </form>

          <div class="mt-6 text-center text-xs text-slate-500">
            <button
              type="button"
              @click="toggleMode(!isRegistering)"
              class="font-bold text-blue-600 hover:text-blue-800 underline underline-offset-4"
            >
              {{ isRegistering ? '¿Ya tienes una cuenta? Inicia sesión' : '¿No tienes cuenta todavía? Regístrate gratis' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../Composables/useAuth'

const router = useRouter()

const {
  email,
  password,
  nombres,
  apellidos,
  cedula,
  loading,
  isRegistering,
  showPassword,
  cooldownActive,
  errorEmail,
  errorPassword,
  errorNombres,
  errorApellidos,
  errorCedula,
  globalError,
  mensajeExito,
  passwordRequirements,
  completedRequirements,
  validateNombres,
  validateApellidos,
  validateCedula,
  validateEmail,
  validatePassword,
  handleAuthSubmit,
  isAuthenticated,
} = useAuth()

function toggleMode(registering: boolean) {
  isRegistering.value = registering
  globalError.value = ''
  mensajeExito.value = ''
}

async function submit() {
  await handleAuthSubmit()
  if (isAuthenticated.value) {
    router.push('/')
  }
}

onMounted(() => {
  if (isAuthenticated.value) {
    router.push('/')
  }
})
</script>
