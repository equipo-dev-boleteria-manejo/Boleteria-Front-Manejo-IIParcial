<template>
  <div class="min-h-screen bg-slate-50 text-slate-800 flex">
    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-40 bg-slate-900 text-white shadow-2xl transition-all duration-300 ease-out flex flex-col justify-between"
      :class="expanded ? 'w-64' : 'w-20'"
      @mouseenter="expanded = true"
      @mouseleave="expanded = false"
    >
      <div>
        <!-- Logo -->
        <div class="h-16 px-4 border-b border-slate-800 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg shrink-0 shadow-md shadow-blue-500/20">
            B
          </div>
          <div
            class="overflow-hidden transition-opacity duration-200"
            :class="expanded ? 'opacity-100' : 'opacity-0 w-0'"
          >
            <h1 class="font-bold text-sm leading-tight text-white whitespace-nowrap">Boletería Front</h1>
            <span class="text-[11px] text-blue-400 font-mono whitespace-nowrap">Cooperativas Ecuador</span>
          </div>
        </div>

        <!-- Perfil / Rol en Sidebar -->
        <div class="px-4 py-3 border-b border-slate-800/80 overflow-hidden">
          <p class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Sesión Activa</p>
          <p
            class="font-bold text-xs text-slate-200 truncate mt-0.5 transition-opacity duration-200"
            :class="expanded ? 'opacity-100' : 'opacity-0 w-0'"
          >
            {{ displayName }}
          </p>
          <span
            class="inline-block mt-1 text-[10px] font-bold rounded-full px-2 py-0.5 uppercase tracking-wider transition-opacity duration-200"
            :class="[
              roleBadgeColor,
              expanded ? 'opacity-100' : 'opacity-0 w-0'
            ]"
          >
            {{ currentRoleName }}
          </span>
        </div>

        <!-- Navegación por Rol -->
        <nav class="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-210px)]">
          <router-link
            v-for="item in visibleItems"
            :key="item.to"
            :to="item.to"
            custom
            v-slot="{ href, navigate, isActive }"
          >
            <a
              :href="href"
              @click="navigate"
              class="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer"
              :class="isActive
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'"
              :title="!expanded ? item.label : ''"
            >
              <span class="text-lg shrink-0 w-6 text-center">{{ item.icon }}</span>
              <span
                class="whitespace-nowrap transition-opacity duration-200"
                :class="expanded ? 'opacity-100' : 'opacity-0 w-0 hidden'"
              >
                {{ item.label }}
              </span>
            </a>
          </router-link>
        </nav>
      </div>

      <!-- Footer de Sesión / Logout -->
      <div class="p-3 border-t border-slate-800">
        <button
          v-if="authStore.isAuthenticated"
          @click="logout"
          class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:text-white hover:bg-red-500/20 transition-all cursor-pointer"
          :title="!expanded ? 'Cerrar sesión' : ''"
        >
          <span class="text-lg shrink-0 w-6 text-center">🚪</span>
          <span
            class="whitespace-nowrap transition-opacity duration-200"
            :class="expanded ? 'opacity-100' : 'opacity-0 w-0 hidden'"
          >
            Cerrar Sesión
          </span>
        </button>

        <router-link
          v-else
          to="/login"
          class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold text-blue-400 hover:text-white hover:bg-blue-600 transition-all"
        >
          <span class="text-lg shrink-0 w-6 text-center">🔐</span>
          <span
            class="whitespace-nowrap transition-opacity duration-200"
            :class="expanded ? 'opacity-100' : 'opacity-0 w-0 hidden'"
          >
            Iniciar Sesión
          </span>
        </router-link>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div
      class="flex-1 flex flex-col min-h-screen transition-all duration-300"
      :class="expanded ? 'ml-64' : 'ml-20'"
    >
      <header class="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 sticky top-0 z-30 flex items-center justify-between">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cooperativas Interprovinciales</p>
          <h2 class="text-base font-extrabold text-slate-800 leading-tight">{{ currentTitle }}</h2>
        </div>

        <div class="flex items-center gap-4">
          <span class="text-xs text-slate-500 font-medium hidden sm:inline-block capitalize">
            {{ todayLabel }}
          </span>

          <div v-if="authStore.isAuthenticated" class="flex items-center gap-2 pl-4 border-l border-slate-200">
            <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
              {{ userInitial }}
            </div>
            <div class="text-left hidden md:block">
              <p class="text-xs font-bold text-slate-800 leading-tight">{{ userShortName }}</p>
              <p class="text-[10px] text-slate-400 capitalize">{{ currentRoleName }}</p>
            </div>
          </div>
        </div>
      </header>

      <main class="flex-1 p-6 max-w-7xl w-full mx-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../Store/authStore'
import { useUiStore } from '../Store/uiStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const uiStore = useUiStore()

const expanded = ref(false)

interface NavItem {
  to: string
  label: string
  icon: string
  roles?: string[]
}

const ADMIN = ['admin', 'administrador']
const OFICINISTA = ['oficinista']
const CHOFER = ['chofer']
const CLIENTE = ['cliente', 'usuario final']

const navItems: NavItem[] = [
  // Dashboard principal
  {
    to: '/',
    label: 'Dashboard',
    icon: '📊',
  },
  // Cliente
  {
    to: '/cliente/comprar-boleto',
    label: 'Comprar Pasajes',
    icon: '🎟️',
    roles: CLIENTE,
  },
  {
    to: '/cliente/mis-boletos',
    label: 'Mis Boletos',
    icon: '🎫',
    roles: CLIENTE,
  },
  // Oficinista / Taquilla
  {
    to: '/oficinista/venta-boletos',
    label: 'Venta en Ventanilla',
    icon: '💳',
    roles: [...OFICINISTA, ...ADMIN],
  },
  {
    to: '/oficinista/aprobar-pagos',
    label: 'Aprobar Transferencias',
    icon: '✅',
    roles: [...OFICINISTA, ...ADMIN],
  },
  // Chofer / Abordaje
  {
    to: '/chofer/validar-qr',
    label: 'Control de Abordaje',
    icon: '📷',
    roles: [...CHOFER, ...ADMIN],
  },
  // Rutas y Frecuencias (Operativo)
  {
    to: '/admin/rutas',
    label: 'Programación de Rutas',
    icon: '🛣️',
    roles: [...OFICINISTA, ...ADMIN],
  },
  {
    to: '/admin/hoja-ruta',
    label: 'Hojas de Ruta',
    icon: '📋',
    roles: ADMIN,
  },
  {
    to: '/admin/frecuencias',
    label: 'Frecuencias ANT',
    icon: '⏱️',
    roles: ADMIN,
  },
  {
    to: '/admin/buses',
    label: 'Flota y Buses',
    icon: '🚌',
    roles: ADMIN,
  },
  // Administración general
  {
    to: '/admin/usuarios',
    label: 'Gestión de Usuarios',
    icon: '👥',
    roles: ADMIN,
  },
  {
    to: '/reportes',
    label: 'Auditoría y Reportes',
    icon: '📈',
    roles: [...OFICINISTA, ...ADMIN],
  },
]

function normalizeRole(value: string | null | undefined): string {
  const norm = (value || '').toLowerCase().trim()
  if (norm === 'administrador') return 'admin'
  if (norm === 'usuario final') return 'cliente'
  return norm
}

const currentRole = computed(() => normalizeRole(authStore.role))

const currentRoleName = computed(() => {
  const r = currentRole.value
  if (r === 'admin') return 'Administrador'
  if (r === 'oficinista') return 'Oficinista'
  if (r === 'chofer') return 'Chofer'
  return 'Cliente'
})

const roleBadgeColor = computed(() => {
  const r = currentRole.value
  if (r === 'admin') return 'bg-purple-500/20 text-purple-300'
  if (r === 'oficinista') return 'bg-blue-500/20 text-blue-300'
  if (r === 'chofer') return 'bg-amber-500/20 text-amber-300'
  return 'bg-emerald-500/20 text-emerald-300'
})

const displayName = computed(() => {
  const u = authStore.user
  return u?.nombre || u?.email || 'Usuario'
})

const userShortName = computed(() => {
  const u = authStore.user
  if (u?.nombres) return u.nombres.split(' ')[0]
  if (u?.nombre) return u.nombre.split(' ')[0]
  if (u?.email) return u.email.split('@')[0]
  return 'Invitado'
})

const userInitial = computed(() => {
  const name = userShortName.value
  return name.charAt(0).toUpperCase()
})

const visibleItems = computed(() => {
  const role = currentRole.value
  if (!authStore.isAuthenticated) {
    return navItems.filter((item) => !item.roles)
  }

  return navItems.filter((item) => {
    if (!item.roles) return true
    return item.roles.map(normalizeRole).includes(role)
  })
})

const currentTitle = computed(() => {
  const match = navItems.find((item) => item.to === route.path)
  return match?.label || 'Panel de Gestión'
})

const todayLabel = computed(() =>
  new Date().toLocaleDateString('es-EC', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
)

async function logout() {
  const confirmed = await uiStore.showConfirm({
    title: 'Cerrar Sesión',
    message: '¿Estás seguro de que deseas salir del sistema de boletería?',
    type: 'warning',
    confirmText: 'Cerrar Sesión',
    cancelText: 'Permanecer',
  })

  if (!confirmed) return

  await authStore.logout()
  router.push('/login')
}
</script>
