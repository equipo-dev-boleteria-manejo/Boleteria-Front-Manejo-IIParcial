import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../Store/authStore'

import Dashboard from '../Views/Dashboard.vue'
import Login from '../Views/Login.vue'
import Usuarios from '../Views/Usuarios.vue'
import BusesAdmin from '../Views/admin/BusesAdmin.vue'
import FrecuenciasAdmin from '../Views/admin/FrecuenciasAdmin.vue'
import RutasAdmin from '../Views/admin/RutasAdmin.vue'
import HojaRutaAdmin from '../Views/admin/HojaRutaAdmin.vue'
import ValidarQR from '../Views/chofer/ValidarQR.vue'
import BuscarRutas from '../Views/cliente/BuscarRutas.vue'
import MisBoletos from '../Views/cliente/MisBoletos.vue'
import VentaBoletos from '../Views/oficinista/VentaBoletos.vue'
import AprobarPago from '../Views/oficinista/AprobarPago.vue'
import Reportes from '../Views/reportes/Reportes.vue'

const ADMIN = ['admin', 'administrador']
const OFICINISTA = ['oficinista']
const CHOFER = ['chofer']
const CLIENTE = ['cliente', 'usuario final']

const TODOS = [...ADMIN, ...OFICINISTA, ...CHOFER, ...CLIENTE]

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { public: true },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { roles: TODOS },
  },
  {
    path: '/admin/usuarios',
    name: 'Usuarios',
    component: Usuarios,
    meta: { roles: ADMIN },
  },
  {
    path: '/admin/buses',
    name: 'BusesAdmin',
    component: BusesAdmin,
    meta: { roles: ADMIN },
  },
  {
    path: '/admin/frecuencias',
    name: 'FrecuenciasAdmin',
    component: FrecuenciasAdmin,
    meta: { roles: ADMIN },
  },
  {
    path: '/admin/rutas',
    name: 'RutasAdmin',
    component: RutasAdmin,
    meta: { roles: [...ADMIN, ...OFICINISTA] },
  },
  {
    path: '/admin/hoja-ruta',
    name: 'HojaRutaAdmin',
    component: HojaRutaAdmin,
    meta: { roles: ADMIN },
  },
  {
    path: '/chofer/validar-qr',
    name: 'ValidarQRChofer',
    component: ValidarQR,
    meta: { roles: [...CHOFER, ...ADMIN] },
  },
  {
    path: '/abordaje',
    name: 'Abordaje',
    component: ValidarQR,
    meta: { roles: [...CHOFER, ...ADMIN, ...OFICINISTA] },
  },
  {
    path: '/cliente/comprar-boleto',
    name: 'ComprarBoletoCliente',
    component: BuscarRutas,
    meta: { roles: CLIENTE },
  },
  {
    path: '/buscar',
    name: 'BuscarRutas',
    component: BuscarRutas,
    meta: { roles: CLIENTE },
  },
  {
    path: '/cliente/mis-boletos',
    name: 'MisBoletosCliente',
    component: MisBoletos,
    meta: { roles: CLIENTE },
  },
  {
    path: '/mis-boletos',
    name: 'MisBoletos',
    component: MisBoletos,
    meta: { roles: CLIENTE },
  },
  {
    path: '/oficinista/venta-boletos',
    name: 'VentaBoletosOficinista',
    component: VentaBoletos,
    meta: { roles: [...OFICINISTA, ...ADMIN] },
  },
  {
    path: '/oficinista/aprobar-pagos',
    name: 'AprobarPago',
    component: AprobarPago,
    meta: { roles: [...OFICINISTA, ...ADMIN] },
  },
  {
    path: '/reportes',
    name: 'Reportes',
    component: Reportes,
    meta: { roles: [...OFICINISTA, ...ADMIN] },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

export function normalizeRole(value: string | null | undefined): string {
  const normalized = (value || '').toLowerCase().trim()
  if (normalized === 'administrador') return 'admin'
  if (normalized === 'usuario final') return 'cliente'
  return normalized
}

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.ready) {
    await authStore.initializeAuth()
  }

  // Si va al login estando ya autenticado, redirigir al inicio
  if (to.path === '/login' && authStore.isAuthenticated) {
    return { path: '/' }
  }

  // Rutas públicas accesibles sin autenticación
  if (to.meta.public) {
    return true
  }

  // Rutas privadas sin autenticación -> al login
  if (!authStore.isAuthenticated) {
    return { path: '/login' }
  }

  const allowedRoles = (to.meta.roles as string[] | undefined) || []

  // Si no especifica roles, permitir acceso a usuarios autenticados
  if (allowedRoles.length === 0) {
    return true
  }

  const userRole = normalizeRole(authStore.role)
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole)

  if (userRole && normalizedAllowedRoles.includes(userRole)) {
    return true
  }

  // Si no tiene el rol permitido, redirigir al dashboard
  return { path: '/' }
})

export default router
