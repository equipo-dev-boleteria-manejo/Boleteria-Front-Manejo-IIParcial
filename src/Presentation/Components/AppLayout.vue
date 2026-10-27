<template>
  <div class="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
    <!-- Backdrop para móviles -->
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-30 bg-black/60 transition-opacity md:hidden"
      @click="mobileOpen = false"
      aria-label="Cerrar menú lateral"
    />

    <!-- Sidebar Principal -->
    <aside
      class="fixed inset-y-0 left-0 z-40 flex h-full flex-col bg-slate-900 text-white shadow-xl transition-all duration-300 ease-in-out md:static no-print"
      :class="[
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        expanded ? 'w-72' : 'w-20'
      ]"
      aria-label="Navegación principal del sistema"
    >
      <!-- Cabecera de la Barra Lateral -->
      <div class="border-b border-slate-800 p-4" :class="!expanded ? 'px-3 text-center' : ''">
        <div class="flex items-center gap-3" :class="!expanded ? 'justify-center' : 'justify-between'">
          <div class="flex items-center gap-3 overflow-hidden">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 font-black text-white text-lg shadow-md shadow-blue-500/30">
              B
            </div>
            <div v-if="expanded" class="min-w-0 transition-opacity duration-200">
              <h1 class="truncate text-base font-black tracking-tight text-white leading-tight">
                Boletería Front
              </h1>
              <p class="truncate text-[11px] font-semibold text-blue-400">
                Cooperativas Ecuador
              </p>
            </div>
          </div>

          <!-- Botón de Colapso (Desktop) -->
          <button
            v-if="expanded"
            type="button"
            @click="expanded = !expanded"
            class="hidden rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors md:flex items-center justify-center"
            title="Colapsar menú"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <!-- Botón para expandir cuando está colapsado -->
        <button
          v-if="!expanded"
          type="button"
          @click="expanded = true"
          class="hidden mt-3 mx-auto rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors md:flex items-center justify-center"
          title="Expandir menú"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        <!-- Tarjeta de Usuario Activo en Sidebar -->
        <div
          v-if="expanded"
          class="mt-4 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3"
        >
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-300 font-bold text-sm ring-1 ring-blue-500/30">
            {{ userInitial }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-bold text-slate-200">
              {{ displayName }}
            </p>
            <span
              class="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
              :class="roleBadgeColor"
            >
              {{ currentRoleName }}
            </span>
          </div>
        </div>
      </div>

      <!-- Menú de Navegación -->
      <nav class="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
        <router-link
          v-for="item in visibleItems"
          :key="item.to"
          :to="item.to"
          custom
          v-slot="{ href, navigate, isActive }"
        >
          <div class="group relative">
            <a
              :href="href"
              @click="navigate"
              class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer"
              :class="[
                isActive
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80',
                !expanded ? 'justify-center px-0' : ''
              ]"
            >
              <!-- Icono SVG -->
              <span class="shrink-0 text-slate-300 group-hover:text-white" :class="isActive ? 'text-white' : ''">
                <component :is="item.iconComponent" class="h-5 w-5" />
              </span>

              <span v-if="expanded" class="truncate">
                {{ item.label }}
              </span>
            </a>

            <!-- Tooltip flotante al estar colapsado (estilo IHC-Grupo2) -->
            <div
              v-if="!expanded"
              class="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-50 hidden w-48 -translate-y-1/2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-left shadow-2xl group-hover:block"
              role="tooltip"
            >
              <p class="text-xs font-bold text-white">{{ item.label }}</p>
              <p class="text-[10px] text-slate-400 mt-0.5">{{ item.desc }}</p>
            </div>
          </div>
        </router-link>
      </nav>

      <!-- Pie de Sesión -->
      <div class="border-t border-slate-800 p-3">
        <button
          v-if="authStore.isAuthenticated"
          type="button"
          @click="logout"
          class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-500/20 transition-all cursor-pointer"
          :class="!expanded ? 'justify-center px-0' : ''"
          :title="!expanded ? 'Cerrar Sesión' : ''"
        >
          <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span v-if="expanded">Cerrar Sesión</span>
        </button>
        <router-link
          v-else
          to="/login"
          class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-blue-400 hover:text-white hover:bg-blue-600 transition-all"
          :class="!expanded ? 'justify-center px-0' : ''"
        >
          <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          <span v-if="expanded">Iniciar Sesión</span>
        </router-link>
      </div>
    </aside>

    <!-- Contenedor Principal -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Encabezado Superior -->
      <header class="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs z-20">
        <div class="flex items-center gap-3">
          <!-- Botón menú hamburguesa (móvil) -->
          <button
            type="button"
            @click="mobileOpen = true"
            class="md:hidden rounded-xl p-2 text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Abrir navegación"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
              Transporte Interprovincial del Ecuador
            </p>
            <h2 class="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-1 leading-tight">
              {{ currentTitle }}
            </h2>
          </div>
        </div>

        <!-- Información de Usuario y Fecha -->
        <div class="flex items-center gap-3 sm:gap-4">
          <span class="hidden md:inline-block text-xs font-semibold text-slate-500 capitalize bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
            📅 {{ todayLabel }}
          </span>

          <div v-if="authStore.isAuthenticated" class="flex items-center gap-2 pl-3 border-l border-slate-200">
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs shadow-xs">
              {{ userInitial }}
            </div>
            <div class="hidden sm:block text-left">
              <p class="text-xs font-bold text-slate-900 leading-tight">{{ userShortName }}</p>
              <p class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{{ currentRoleName }}</p>
            </div>
          </div>
        </div>
      </header>

      <!-- Área de Contenido Principal -->
      <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/70">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../Store/authStore'
import { useUiStore } from '../Store/uiStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const uiStore = useUiStore()

const expanded = ref(true)
const mobileOpen = ref(false)

// Componentes SVG reutilizables para el menú
const IconDashboard = {
  render: () =>
    h('svg', { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' }),
    ]),
}

const IconTickets = {
  render: () =>
    h('svg', { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' }),
    ]),
}

const IconMyTickets = {
  render: () =>
    h('svg', { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }),
    ]),
}

const IconCashier = {
  render: () =>
    h('svg', { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' }),
    ]),
}

const IconApprove = {
  render: () =>
    h('svg', { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }),
    ]),
}

const IconQR = {
  render: () =>
    h('svg', { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z' }),
    ]),
}

const IconRoutes = {
  render: () =>
    h('svg', { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' }),
    ]),
}

const IconTripSheet = {
  render: () =>
    h('svg', { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' }),
    ]),
}

const IconFrequencies = {
  render: () =>
    h('svg', { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }),
    ]),
}

const IconBuses = {
  render: () =>
    h('svg', { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M8 7h8m-8 4h8m-9 8h10M5 3h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm2 14a1 1 0 100 2 1 1 0 000-2zm10 0a1 1 0 100 2 1 1 0 000-2z' }),
    ]),
}

const IconUsers = {
  render: () =>
    h('svg', { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' }),
    ]),
}

const IconReports = {
  render: () =>
    h('svg', { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }),
    ]),
}

interface NavItem {
  to: string
  label: string
  desc: string
  iconComponent: any
  roles?: string[]
}

const ADMIN = ['admin', 'administrador']
const OFICINISTA = ['oficinista']
const CHOFER = ['chofer']
const CLIENTE = ['cliente', 'usuario final']

const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    desc: 'Métricas, resumen operativo y KPIs de transporte.',
    iconComponent: IconDashboard,
  },
  {
    to: '/cliente/comprar-boleto',
    label: 'Comprar Pasajes',
    desc: 'Búsqueda de itinerarios y reserva de asientos.',
    iconComponent: IconTickets,
    roles: CLIENTE,
  },
  {
    to: '/cliente/mis-boletos',
    label: 'Mis Boletos',
    desc: 'Historial de compras y comprobantes de viaje.',
    iconComponent: IconMyTickets,
    roles: CLIENTE,
  },
  {
    to: '/oficinista/venta-boletos',
    label: 'Venta en Ventanilla',
    desc: 'Emisión inmediata de pasajes en terminal.',
    iconComponent: IconCashier,
    roles: [...OFICINISTA, ...ADMIN],
  },
  {
    to: '/oficinista/aprobar-pagos',
    label: 'Aprobar Transferencias',
    desc: 'Validación contable de pagos y depósitos bancarios.',
    iconComponent: IconApprove,
    roles: [...OFICINISTA, ...ADMIN],
  },
  {
    to: '/chofer/validar-qr',
    label: 'Control de Abordaje',
    desc: 'Lectura de códigos QR y control de pasajeros.',
    iconComponent: IconQR,
    roles: [...CHOFER, ...ADMIN],
  },
  {
    to: '/admin/rutas',
    label: 'Programación de Rutas',
    desc: 'Horarios, paradas intermedias y tarifas oficiales.',
    iconComponent: IconRoutes,
    roles: [...OFICINISTA, ...ADMIN],
  },
  {
    to: '/admin/hoja-ruta',
    label: 'Hojas de Ruta',
    desc: 'Despacho oficial de unidades y choferes de turno.',
    iconComponent: IconTripSheet,
    roles: ADMIN,
  },
  {
    to: '/admin/frecuencias',
    label: 'Frecuencias ANT',
    desc: 'Permisos de operación y turnos autorizados.',
    iconComponent: IconFrequencies,
    roles: ADMIN,
  },
  {
    to: '/admin/buses',
    label: 'Flota y Buses',
    desc: 'Capacidad de asientos, chasis y estado mecánico.',
    iconComponent: IconBuses,
    roles: ADMIN,
  },
  {
    to: '/admin/usuarios',
    label: 'Gestión de Usuarios',
    desc: 'Administración de personal, choferes y clientes.',
    iconComponent: IconUsers,
    roles: ADMIN,
  },
  {
    to: '/reportes',
    label: 'Auditoría y Reportes',
    desc: 'Trazabilidad de operaciones y gestión de cambios CCB.',
    iconComponent: IconReports,
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
  if (r === 'admin') return 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
  if (r === 'oficinista') return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
  if (r === 'chofer') return 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
  return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
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
