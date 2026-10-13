<template>
  <div class="min-h-screen bg-slate-50 text-slate-800 flex">
    <!-- Sidebar -->
    <aside class="w-64 bg-slate-900 text-white flex flex-col justify-between">
      <div>
        <div class="p-6 border-b border-slate-800 flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg">
            B
          </div>
          <div>
            <h1 class="font-bold text-sm leading-tight text-white">Boletería Front</h1>
            <span class="text-xs text-blue-400 font-mono">v0.1.0 (Base)</span>
          </div>
        </div>

        <nav class="p-4 space-y-1">
          <router-link
            to="/"
            class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            active-class="bg-blue-600 text-white font-semibold"
            exact-active-class="bg-blue-600 text-white font-semibold"
          >
            <span>🏠</span>
            <span>Dashboard</span>
          </router-link>

          <router-link
            to="/login"
            v-if="!authStore.isAuthenticated"
            class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            active-class="bg-blue-600 text-white font-semibold"
          >
            <span>🔐</span>
            <span>Iniciar Sesión</span>
          </router-link>
        </nav>
      </div>

      <div class="p-4 border-t border-slate-800">
        <div v-if="authStore.isAuthenticated" class="flex items-center justify-between">
          <div>
            <p class="text-xs text-slate-400 font-semibold">{{ authStore.user?.email }}</p>
            <p class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{{ authStore.role }}</p>
          </div>
          <button
            @click="authStore.logout()"
            class="text-xs text-red-400 hover:text-red-300 font-semibold transition"
          >
            Salir
          </button>
        </div>
        <div v-else class="text-xs text-slate-400">
          Modo invitado
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-h-screen">
      <header class="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
        <h2 class="text-base font-bold text-slate-800">Sistema de Gestión de Pasajes Interprovinciales</h2>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            Sprint 1 - Inicial
          </span>
        </div>
      </header>

      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../Store/authStore'

const authStore = useAuthStore()
</script>
