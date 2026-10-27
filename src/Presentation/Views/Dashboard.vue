<template>
  <div class="space-y-6 max-w-7xl mx-auto font-sans">
    <!-- Estado 1: CARGANDO (Skeleton Loader) -->
    <section v-if="loading" class="rounded-3xl bg-white p-8 shadow-sm border border-slate-200/80 animate-pulse space-y-6" aria-busy="true">
      <div class="flex items-center gap-4">
        <div class="h-12 w-12 rounded-2xl bg-slate-200"></div>
        <div class="space-y-2 flex-1">
          <div class="h-5 w-48 bg-slate-200 rounded"></div>
          <div class="h-3 w-64 bg-slate-100 rounded"></div>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        <div v-for="i in 4" :key="i" class="h-28 rounded-2xl bg-slate-100 p-4 space-y-3">
          <div class="h-3 w-20 bg-slate-200 rounded"></div>
          <div class="h-8 w-24 bg-slate-300 rounded"></div>
        </div>
      </div>
    </section>

    <!-- Estado 2: ERROR -->
    <section v-else-if="error" class="rounded-3xl border border-rose-200 bg-rose-50/80 p-8 text-rose-800 shadow-sm" role="alert">
      <div class="flex items-start gap-4">
        <span class="text-3xl">⚠️</span>
        <div class="space-y-1">
          <h2 class="text-lg font-black text-rose-900">No se pudieron cargar las métricas operativas</h2>
          <p class="text-xs text-rose-700 leading-relaxed">{{ error }}</p>
          <div class="pt-3">
            <ButtonBase variant="danger" size="sm" @click="recargar">
              Reintentar Carga
            </ButtonBase>
          </div>
        </div>
      </div>
    </section>

    <!-- Estado 3 & 4: ÉXITO O VACÍO -->
    <template v-else>
      <!-- Bienvenida y Banner de Cabecera (Estilo IHC-Grupo2) -->
      <section class="rounded-[2rem] bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-6 sm:p-8 text-white shadow-xl shadow-blue-900/10 relative overflow-hidden">
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-2.5">
            <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-xs font-bold uppercase tracking-wider text-blue-200">
              {{ saludoHora }} • Terminal Operativo
            </span>
          </div>

          <h1 class="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Hola, {{ displayName }}.
          </h1>

          <p class="text-blue-100 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
            {{ rolMensaje }}
          </p>
        </div>

        <div class="absolute -right-6 -bottom-8 opacity-10 text-8xl font-black select-none pointer-events-none">
          🚌
        </div>
      </section>

      <!-- Grid de KPIs Generales (Estilo MetricCard de IHC-Grupo2) -->
      <section v-if="kpisList && kpisList.length > 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="(kpi, idx) in kpisList"
          :key="kpi.label"
          class="rounded-2xl border p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
          :class="getKpiCardClasses(idx)"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-slate-700">
                {{ kpi.label }}
              </p>
              <p class="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {{ kpi.value }}
              </p>
            </div>

            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-xs"
              :class="getKpiIconContainerClasses(idx)"
            >
              <span>{{ kpi.icon || '📊' }}</span>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-200/60">
            <p v-if="kpi.hint" class="text-xs text-slate-600 font-medium">
              {{ kpi.hint }}
            </p>
            <p
              v-else-if="typeof kpi.delta === 'number'"
              class="text-xs font-bold flex items-center gap-1"
              :class="kpi.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'"
            >
              <span>{{ kpi.delta >= 0 ? '↑' : '↓' }}</span>
              <span>{{ Math.abs(kpi.delta) }}% vs mes anterior</span>
            </p>
            <span v-else class="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
              Operativo
            </span>
          </div>
        </article>
      </section>

      <!-- Estado Vacío de KPIs -->
      <section v-else class="rounded-2xl bg-white p-8 text-center border border-slate-200 text-slate-400">
        <p class="text-3xl mb-2">📋</p>
        <p class="text-xs font-bold uppercase tracking-wider">Sin indicadores configurados para este perfil</p>
      </section>

      <!-- Panel Específico para Chofer -->
      <section v-if="esChofer" class="grid gap-6 lg:grid-cols-2">
        <div class="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
          <h2 class="text-base font-bold text-slate-900">Validación y Abordaje de Pasajeros</h2>
          <p class="text-xs text-slate-500 mt-1 mb-4">Escanea el código QR de los boletos digitales en puerta del bus.</p>
          <router-link
            to="/chofer/validar-qr"
            class="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            📷 Abrir Escáner de Boleto QR
          </router-link>
        </div>
      </section>

      <!-- Panel Específico para Cliente -->
      <section v-if="esCliente" class="grid gap-6 lg:grid-cols-2">
        <div class="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
          <h2 class="text-base font-bold text-slate-900">Tu Próximo Viaje</h2>
          <p class="text-xs text-slate-500 mt-1 mb-4">Boleto activo más cercano en itinerario.</p>

          <div v-if="proximoViaje" class="rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-5 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black uppercase text-emerald-800">
                {{ proximoViaje.fecha }} • {{ proximoViaje.hora || '--:--' }}
              </span>
              <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                Confirmado
              </span>
            </div>
            <h3 class="text-lg font-black text-slate-900">
              {{ proximoViaje.origen }} ➔ {{ proximoViaje.destino }}
            </h3>
            <p class="text-xs text-slate-600">
              Cooperativa: <span class="font-bold text-slate-800">{{ proximoViaje.cooperativa || 'Cooperativa' }}</span> • Asiento: <span class="font-bold text-slate-800">{{ proximoViaje.asiento || 'N/D' }}</span>
            </p>
            <div class="pt-2">
              <router-link
                to="/cliente/mis-boletos"
                class="inline-block py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-sm cursor-pointer"
              >
                Ver Boleto Digital y QR
              </router-link>
            </div>
          </div>
          <div v-else class="py-8 text-center text-slate-400 space-y-2">
            <p class="text-3xl">🎫</p>
            <p class="text-xs font-semibold">No tienes boletos reservados para los próximos días.</p>
            <router-link
              to="/cliente/comprar-boleto"
              class="inline-block text-xs font-black text-blue-600 hover:text-blue-800 underline underline-offset-4"
            >
              Buscar rutas y comprar pasajes →
            </router-link>
          </div>
        </div>

        <div class="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
          <h2 class="text-base font-bold text-slate-900">Resumen de Beneficios</h2>
          <p class="text-xs text-slate-500 mt-1 mb-4">Tarifas y descuentos aplicados por ley.</p>

          <div class="space-y-3">
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-slate-700">Descuento de Ley Asociado</p>
                <p class="text-[11px] text-slate-500">Verificado automáticamente por cédula ecuatoriana</p>
              </div>
              <span class="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 border border-blue-200 font-black text-xs">
                30% / 50%
              </span>
            </div>

            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-slate-700">Historial de Compras</p>
                <p class="text-[11px] text-slate-500">Comprobantes y boletos anteriores</p>
              </div>
              <router-link
                to="/cliente/mis-boletos"
                class="text-xs font-bold text-blue-600 hover:underline"
              >
                Consultar →
              </router-link>
            </div>
          </div>
        </div>
      </section>

      <!-- Accesos Rápidos Generales (Estilo IHC-Grupo2) -->
      <section class="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
        <div class="mb-4">
          <h2 class="text-base font-bold text-slate-900">Accesos Directos del Sistema</h2>
          <p class="text-xs text-slate-500">Módulos principales organizados según tus permisos de rol.</p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <router-link
            v-for="accion in accesosRapidos"
            :key="accion.to"
            :to="accion.to"
            class="rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all p-4 flex items-center gap-3.5 group shadow-xs cursor-pointer"
          >
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <span class="text-xl">{{ accion.icon }}</span>
            </div>
            <div class="overflow-hidden min-w-0">
              <p class="font-bold text-slate-900 text-xs sm:text-sm truncate group-hover:text-blue-700">
                {{ accion.label }}
              </p>
              <p class="text-[11px] text-slate-500 truncate mt-0.5">
                {{ accion.desc }}
              </p>
            </div>
          </router-link>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../Store/authStore'
import { useDashboard } from '../Composables/useDashboard'
import ButtonBase from '../Components/ButtonBase.vue'

const authStore = useAuthStore()
const { resumen, loading, error, recargar, cargarDashboard } = useDashboard()

onMounted(() => {
  if (!resumen.value) {
    cargarDashboard()
  }
})

const displayName = computed(() => {
  const u: any = authStore.user
  return u?.nombre || u?.nombres || u?.email?.split('@')[0] || 'Usuario'
})

const saludoHora = computed(() => {
  const hora = new Date().getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
})

const rolMensaje = computed(() => {
  return resumen.value?.rolMensaje || 'Bienvenido a la plataforma centralizada de boletería interprovincial.'
})

const esCliente = computed(() => resumen.value?.tipo === 'cliente')
const esChofer = computed(() => resumen.value?.tipo === 'chofer')

const kpisList = computed(() => resumen.value?.kpis ?? [])
const proximoViaje = computed(() => resumen.value?.proximoViaje ?? null)

function getKpiCardClasses(index: number): string {
  const tones = [
    'border-blue-200 bg-blue-50/60',
    'border-emerald-200 bg-emerald-50/60',
    'border-indigo-200 bg-indigo-50/60',
    'border-amber-200 bg-amber-50/60',
  ]
  return tones[index % tones.length]
}

function getKpiIconContainerClasses(index: number): string {
  const iconTones = [
    'bg-blue-100 text-blue-800',
    'bg-emerald-100 text-emerald-800',
    'bg-indigo-100 text-indigo-800',
    'bg-amber-100 text-amber-900',
  ]
  return iconTones[index % iconTones.length]
}

const accesosRapidos = computed(() => {
  if (resumen.value?.accesosRapidos && resumen.value.accesosRapidos.length > 0) {
    return resumen.value.accesosRapidos
  }
  const rol = (authStore.role || '').toLowerCase()
  if (rol.includes('admin')) {
    return [
      { to: '/admin/usuarios', label: 'Gestión de Usuarios', desc: 'Altas y control de roles', icon: '👥' },
      { to: '/reportes', label: 'Auditoría y Reportes', desc: 'KPIs y trazabilidad CCB', icon: '📈' },
      { to: '/admin/buses', label: 'Flota de Buses', desc: 'Catálogo de vehículos', icon: '🚌' },
      { to: '/admin/rutas', label: 'Programación de Rutas', desc: 'Itinerarios y frecuencias', icon: '🛣️' },
    ]
  }
  if (rol.includes('oficinista')) {
    return [
      { to: '/oficinista/venta-boletos', label: 'Venta en Taquilla', desc: 'Emisión rápida de boletos', icon: '💳' },
      { to: '/oficinista/aprobar-pagos', label: 'Aprobar Pagos', desc: 'Validar transferencias', icon: '✅' },
      { to: '/reportes', label: 'Reportes Diarios', desc: 'Arqueo y ventas de turno', icon: '📊' },
    ]
  }
  if (rol.includes('chofer')) {
    return [
      { to: '/chofer/validar-qr', label: 'Escanear QR', desc: 'Control de abordaje', icon: '📷' },
    ]
  }
  return [
    { to: '/cliente/comprar-boleto', label: 'Buscar Rutas', desc: 'Comprar pasajes en línea', icon: '🎟️' },
    { to: '/cliente/mis-boletos', label: 'Mis Boletos', desc: 'Boletos activos y QR', icon: '🎫' },
  ]
})
</script>
