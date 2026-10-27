<template>
  <main class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 py-8 flex items-center justify-center text-slate-900 font-sans">
    <section class="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">

      <!-- Columna Izquierda: Identidad de Marca y Beneficios (Estilo IHC-Grupo2) -->
      <aside class="hidden overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-8 lg:p-10 text-white shadow-2xl lg:flex flex-col justify-between h-full min-h-[580px]">
        <div>
          <div class="mb-8 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold tracking-wide backdrop-blur border border-white/20">
            <span class="h-2 w-2 rounded-full bg-emerald-300 animate-pulse"></span>
            Cooperativas de Transporte Terrestre del Ecuador
          </div>

          <h1 class="max-w-lg text-4xl xl:text-5xl font-black leading-tight tracking-tight">
            Gestión inteligente de pasajes y frecuencias de transporte.
          </h1>

          <p class="mt-5 max-w-xl text-sm leading-relaxed text-blue-100">
            Plataforma oficial desarrollada con principios de usabilidad, validación matemática de cédula ecuatoriana y control de acceso basado en roles (RBAC).
          </p>

          <div class="mt-8 grid gap-3.5">
            <div class="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-sm backdrop-blur">
              <p class="font-bold text-sm">Control Operativo y Hojas de Ruta</p>
              <p class="mt-1 text-xs leading-5 text-blue-100">
                Supervisión en tiempo real de salidas, asignación de choferes y control de abordaje con código QR.
              </p>
            </div>

            <div class="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-sm backdrop-blur">
              <p class="font-bold text-sm">Tarifas Transparentes Reguladas por ANT</p>
              <p class="mt-1 text-xs leading-5 text-blue-100">
                Cálculo automático de descuentos de ley para menores, adultos mayores y personas con discapacidad.
              </p>
            </div>

            <div class="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-sm backdrop-blur">
              <p class="font-bold text-sm">Prevención de Errores y Seguridad</p>
              <p class="mt-1 text-xs leading-5 text-blue-100">
                Verificación inmediata de campos, reglas de negocio auditables y sesión persistente.
              </p>
            </div>
          </div>
        </div>

        <div class="pt-6 border-t border-white/15 text-xs text-blue-200 flex items-center justify-between">
          <span>Terminales Terrestres del Ecuador</span>
          <span class="font-mono text-[11px]">v2.0 • Clean Architecture</span>
        </div>
      </aside>

      <!-- Columna Derecha: Tarjeta de Acceso y Formulario -->
      <section class="mx-auto w-full max-w-md">
        <!-- Logo y Título -->
        <div class="mb-5 flex items-center justify-center gap-3 lg:justify-start">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 font-black text-white text-xl shadow-lg shadow-blue-500/30">
            B
          </div>
          <div>
            <h2 class="font-black text-slate-900 text-base leading-tight">Boletería Front</h2>
            <p class="text-xs text-slate-500 font-medium">Terminales Terrestres del Ecuador</p>
          </div>
        </div>

        <!-- Tarjeta Principal Blanca con Backdrop Blur -->
        <div class="rounded-[2rem] border border-white/80 bg-white/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div class="mb-6">
            <p class="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
              {{ isRegistering ? 'Crear cuenta' : 'Inicio de sesión' }}
            </p>
            <h2 class="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
              {{ isRegistering ? 'Únete al sistema' : 'Bienvenido/a de nuevo' }}
            </h2>
            <p class="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
              {{ isRegistering
                ? 'Ingresa tus datos para registrarte y emitir pasajes de inmediato.'
                : 'Ingresa tus credenciales para acceder al panel de gestión.' }}
            </p>
          </div>

          <!-- Selector de Modo Contextual (Estilo IHC-Grupo2) -->
          <nav aria-label="Modo de acceso" class="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-xs sm:text-sm font-bold">
            <button
              type="button"
              @click="toggleMode(false)"
              class="rounded-xl py-2.5 transition-all cursor-pointer"
              :class="!isRegistering ? 'bg-white text-blue-700 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'"
            >
              Ingresar
            </button>
            <button
              type="button"
              @click="toggleMode(true)"
              class="rounded-xl py-2.5 transition-all cursor-pointer"
              :class="isRegistering ? 'bg-white text-blue-700 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'"
            >
              Registrarse
            </button>
          </nav>

          <!-- Banner de Errores Globales -->
          <div
            v-if="globalError"
            class="mb-5 rounded-2xl bg-rose-50 p-4 text-xs text-rose-700 border border-rose-200 font-semibold flex items-start gap-2.5"
            role="alert"
          >
            <svg class="h-4 w-4 shrink-0 mt-0.5 text-rose-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{{ globalError }}</span>
          </div>

          <!-- Banner de Éxito -->
          <div
            v-if="mensajeExito"
            class="mb-5 rounded-2xl bg-emerald-50 p-4 text-xs text-emerald-800 border border-emerald-200 font-semibold flex items-start gap-2.5"
            role="status"
          >
            <svg class="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ mensajeExito }}</span>
          </div>

          <form @submit.prevent="submit" class="space-y-4">
            <!-- Campos específicos de Registro -->
            <template v-if="isRegistering">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                  <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Nombres</label>
                  <input
                    v-model="nombres"
                    @blur="validateNombres"
                    type="text"
                    required
                    placeholder="Ej. Juan Carlos"
                    class="mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    :class="errorNombres ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'"
                  />
                  <p v-if="errorNombres" class="mt-1 text-[11px] font-bold text-rose-600">{{ errorNombres }}</p>
                </div>

                <div class="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                  <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Apellidos</label>
                  <input
                    v-model="apellidos"
                    @blur="validateApellidos"
                    type="text"
                    required
                    placeholder="Ej. Pérez Gómez"
                    class="mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    :class="errorApellidos ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'"
                  />
                  <p v-if="errorApellidos" class="mt-1 text-[11px] font-bold text-rose-600">{{ errorApellidos }}</p>
                </div>
              </div>

              <div class="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Cédula Ecuatoriana (10 dígitos)</label>
                <input
                  v-model="cedula"
                  @blur="validateCedula"
                  type="text"
                  maxlength="10"
                  required
                  placeholder="Ej. 1710034065"
                  class="mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all font-mono placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  :class="errorCedula ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'"
                />
                <p v-if="errorCedula" class="mt-1 text-[11px] font-bold text-rose-600">{{ errorCedula }}</p>
                <p v-else class="mt-1 text-[11px] text-slate-500">Validada con algoritmo Módulo 10 del Registro Civil.</p>
              </div>
            </template>

            <!-- Correo Electrónico -->
            <div class="rounded-2xl bg-slate-50 p-3 border border-slate-100">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Correo Electrónico</label>
              <input
                v-model="email"
                @blur="validateEmail"
                type="email"
                required
                autocomplete="email"
                placeholder="usuario@transporte.ec"
                class="mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                :class="errorEmail ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'"
              />
              <p v-if="errorEmail" class="mt-1 text-[11px] font-bold text-rose-600">{{ errorEmail }}</p>
              <p v-else class="mt-1 text-[11px] text-slate-500">Ejemplo: usuario@transporte.ec</p>
            </div>

            <!-- Contraseña -->
            <div class="rounded-2xl bg-slate-50 p-3 border border-slate-100">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Contraseña</label>
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {{ showPassword ? 'Ocultar' : 'Ver contraseña' }}
                </button>
              </div>
              <div class="relative mt-1.5">
                <input
                  v-model="password"
                  @blur="validatePassword"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 pr-10"
                  :class="errorPassword ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'"
                />
              </div>
              <p v-if="errorPassword" class="mt-1 text-[11px] font-bold text-rose-600">{{ errorPassword }}</p>

              <!-- Medidor de Requisitos de Contraseña en Registro (Estilo IHC-Grupo2) -->
              <div v-if="isRegistering" class="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                <div class="mb-2 flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Seguridad de contraseña</span>
                  <span>{{ completedRequirements }}/4</span>
                </div>
                <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-blue-600 transition-all duration-300"
                    :style="{ width: `${(completedRequirements / 4) * 100}%` }"
                  ></div>
                </div>
                <ul class="mt-2.5 grid grid-cols-2 gap-1.5 text-[10px] text-slate-600">
                  <li
                    v-for="req in passwordRequirements"
                    :key="req.label"
                    class="flex items-center gap-1.5"
                    :class="req.isValid ? 'text-emerald-700 font-bold' : 'text-slate-400'"
                  >
                    <span>{{ req.isValid ? '✓' : '•' }}</span>
                    <span>{{ req.label }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Botón de Envío -->
            <button
              :disabled="loading || cooldownActive"
              type="submit"
              class="w-full rounded-xl bg-blue-600 py-3.5 px-4 font-bold text-white text-sm shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none mt-2 cursor-pointer"
            >
              <span v-if="loading" class="inline-flex items-center justify-center gap-2">
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

          <!-- Toggle de modo de acceso -->
          <div class="mt-6 text-center text-xs text-slate-500">
            <button
              type="button"
              @click="toggleMode(!isRegistering)"
              class="font-bold text-blue-600 hover:text-blue-800 underline underline-offset-4 cursor-pointer"
            >
              {{ isRegistering ? '¿Ya tienes una cuenta? Inicia sesión' : '¿No tienes cuenta todavía? Regístrate gratis' }}
            </button>
          </div>
        </div>
      </section>
    </section>
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
