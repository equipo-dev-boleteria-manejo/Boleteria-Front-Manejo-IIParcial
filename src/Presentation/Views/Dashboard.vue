<template>
  <div class="space-y-6 max-w-7xl mx-auto">
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
    <section v-else-if="error" class="rounded-3xl border border-red-200 bg-red-50/80 p-8 text-red-800 shadow-sm" role="alert">
      <div class="flex items-start gap-4">
        <span class="text-3xl">⚠️</span>
        <div class="space-y-1">
          <h2 class="text-lg font-black text-red-900">No se pudieron cargar las métricas operativas</h2>
          <p class="text-xs text-red-700 leading-relaxed">{{ error }}</p>
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
      <!-- Bienvenida y Banner de Cabecera -->
      <section class="rounded-[2.5rem] bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-8 lg:p-10 text-white shadow-xl shadow-blue-900/10 relative overflow-hidden">
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-3">
            <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-xs font-bold uppercase tracking-wider text-blue-200">
              {{ saludoHora }}
            </span>
          </div>

          <h1 class="text-3xl lg:text-4xl font-black tracking-tight leading-tight">
            Hola, {{ displayName }}.
          </h1>

          <p class="text-blue-100 text-sm mt-2 max-w-2xl leading-relaxed">
            {{ rolMensaje }}
          </p>
        </div>

        <div class="absolute -right-8 -bottom-10 opacity-10 text-9xl font-black select-none pointer-events-none">
          🚌
        </div>
      </section>

      <!-- Grid de KPIs Generales -->
      <section v-if="kpisList && kpisList.length > 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="kpi in kpisList"
          :key="kpi.label"
          class="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80 hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
        >
          <div class="flex items-start justify-between">
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {{ kpi.label }}
            </p>
            <span class="text-2xl">{{ kpi.icon || '📊' }}</span>
          </div>

          <div class="mt-4">
            <p class="text-3xl font-black text-slate-900 tracking-tight">
              {{ kpi.value }}
            </p>

            <p v-if="kpi.hint" class="mt-1 text-xs text-slate-500 font-medium">
              {{ kpi.hint }}
            </p>

            <p
              v-else-if="typeof kpi.delta === 'number'"
              class="mt-1 text-xs font-bold flex items-center gap-1"
              :class="kpi.delta >= 0 ? 'text-emerald-600' : 'text-red-600'"
            >
              <span>{{ kpi.delta >= 0 ? '↑' : '↓' }}</span>
              <span>{{ Math.abs(kpi.delta) }}% vs periodo anterior</span>
            </p>
          </div>
        </article>
      </section>

      <!-- Estado Vacío de KPIs -->
      <section v-else class="rounded-2xl bg-white p-8 text-center border border-slate-200 text-slate-400">
        <p class="text-3xl mb-2">📋</p>
        <p class="text-xs font-bold uppercase tracking-wider">Sin indicadores configurados para este perfil</p>
      </section>

      <!-- Panel Específico para Chofer -->
      <section v-if="esChofer" class="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <CardBase title="Viaje Actual o Próximo" subtitle="Hoja de ruta y detalles operativos del turno">
          <div v-if="proximoViaje" class="rounded-2xl bg-blue-50/70 border border-blue-200/80 p-6 space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black uppercase tracking-wider text-blue-700">
                {{ proximoViaje.fecha }} • {{ proximoViaje.hora || '--:--' }}
              </span>
              <span class="inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800">
                {{ proximoViaje.estado || 'Programado' }}
              </span>
            </div>

            <h3 class="text-2xl font-black text-slate-900">
              {{ proximoViaje.origen }} ➔ {{ proximoViaje.destino }}
            </h3>

            <div class="grid gap-3 sm:grid-cols-3 pt-2">
              <div class="rounded-xl bg-white p-3.5 border border-blue-100 shadow-sm">
                <p class="text-[10px] font-bold text-slate-400 uppercase">Bus Asignado</p>
                <p class="font-black text-slate-900 mt-0.5">{{ proximoViaje.bus || 'N/D' }}</p>
              </div>
              <div class="rounded-xl bg-white p-3.5 border border-blue-100 shadow-sm">
                <p class="text-[10px] font-bold text-slate-400 uppercase">Placa Oficial</p>
                <p class="font-black text-slate-900 mt-0.5">{{ proximoViaje.placa || 'Sin placa' }}</p>
              </div>
              <div class="rounded-xl bg-white p-3.5 border border-blue-100 shadow-sm">
                <p class="text-[10px] font-bold text-slate-400 uppercase">Capacidad</p>
                <p class="font-black text-slate-900 mt-0.5">{{ proximoViaje.asientos || '40' }} asientos</p>
              </div>
            </div>
          </div>

          <div v-else class="py-8 text-center text-slate-400">
            <p class="text-2xl mb-1">💤</p>
            <p class="text-sm font-semibold">No tienes ningún viaje asignado para hoy.</p>
          </div>
        </CardBase>

        <CardBase title="Control de Abordaje" subtitle="Validación en puerta">
          <div class="space-y-4 text-center py-4">
            <div class="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
              📷
            </div>
            <div>
              <p class="text-xs text-slate-500 max-w-xs mx-auto">
                Escanea los boletos de los pasajeros con la cámara del dispositivo móvil para registrar su abordaje.
              </p>
            </div>
            <router-link
              to="/chofer/validar-qr"
              class="inline-block w-full py-3.5 px-4 rounded-xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              Escanear Boleto QR
            </router-link>
          </div>
        </CardBase>
      </section>

      <!-- Panel Específico para Cliente -->
      <section v-if="esCliente" class="grid gap-6 lg:grid-cols-2">
        <CardBase title="Tu Próximo Viaje" subtitle="Boleto activo más cercano">
          <div v-if="proximoViaje" class="rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-6 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black uppercase text-emerald-800">
                {{ proximoViaje.fecha }} • {{ proximoViaje.hora || '--:--' }}
              </span>
              <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700">
                Confirmado
              </span>
            </div>
            <h3 class="text-xl font-black text-slate-900">
              {{ proximoViaje.origen }} ➔ {{ proximoViaje.destino }}
            </h3>
            <p class="text-xs text-slate-600">
              Cooperativa: <span class="font-bold text-slate-800">{{ proximoViaje.cooperativa || 'Cooperativa' }}</span> • Asiento: <span class="font-bold text-slate-800">{{ proximoViaje.asiento || 'N/D' }}</span>
            </p>
            <div class="pt-2">
              <router-link
                to="/cliente/mis-boletos"
                class="inline-block py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-sm"
              >
                Ver Boleto Digital y QR
              </router-link>
            </div>
          </div>
          <div v-else class="py-10 text-center text-slate-400 space-y-3">
            <p class="text-3xl">🎫</p>
            <p class="text-xs font-semibold">No tienes boletos reservados para los próximos días.</p>
            <router-link
              to="/cliente/buscar-rutas"
              class="inline-block text-xs font-black text-blue-600 hover:text-blue-800 underline underline-offset-4"
            >
              Buscar rutas y comprar pasajes →
            </router-link>
          </div>
        </CardBase>

        <CardBase title="Resumen de Viajes y Beneficios" subtitle="Tarifas y descuentos aplicados">
          <div class="space-y-4 py-2">
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-slate-700">Descuento de Ley Asociado</p>
                <p class="text-[11px] text-slate-500">Verificado automáticamente por cédula ecuatoriana</p>
              </div>
              <span class="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-black text-xs">
                30% / 50%
              </span>
            </div>

            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-slate-700">Historial de Compras</p>
                <p class="text-[11px] text-slate-500">Acceso a comprobantes y boletos anteriores</p>
              </div>
              <router-link
                to="/cliente/mis-boletos"
                class="text-xs font-bold text-blue-600 hover:underline"
              >
                Consultar →
              </router-link>
            </div>
          </div>
        </CardBase>
      </section>

      <!-- Accesos Rápidos Generales -->
      <CardBase title="Accesos Rápidos del Sistema" subtitle="Módulos directos de acuerdo a tus permisos de rol">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <router-link
            v-for="accion in accesosRapidos"
            :key="accion.to"
            :to="accion.to"
            class="rounded-xl border border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/50 transition-all p-4 flex items-center gap-3.5 group shadow-sm"
          >
            <span class="text-2xl shrink-0 group-hover:scale-110 transition-transform">
              {{ accion.icon }}
            </span>
            <div class="overflow-hidden">
              <p class="font-bold text-slate-900 text-xs sm:text-sm truncate group-hover:text-blue-700">
                {{ accion.label }}
              </p>
              <p class="text-[11px] text-slate-500 truncate mt-0.5">
                {{ accion.desc }}
              </p>
            </div>
          </router-link>
        </div>
      </CardBase>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../Store/authStore'
import { useDashboard } from '../Composables/useDashboard'
import CardBase from '../Components/CardBase.vue'
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
const accesosRapidos = computed(() => {
  if (resumen.value?.accesosRapidos && resumen.value.accesosRapidos.length > 0) {
    return resumen.value.accesosRapidos
  }
  // Accesos canónicos por defecto según rol
  const rol = (authStore.userRole || '').toLowerCase()
  if (rol === 'administrador') {
    return [
      { to: '/usuarios', label: 'Gestión de Usuarios', desc: 'Altas y control de roles', icon: '👥' },
      { to: '/reportes', label: 'Auditoría y Reportes', desc: 'KPIs y trazabilidad', icon: '📈' },
      { to: '/admin/buses', label: 'Flota de Buses', desc: 'Catálogo de vehículos', icon: '🚌' },
      { to: '/admin/rutas', label: 'Rutas Diarias', desc: 'Programación y hojas de ruta', icon: '🗺️' },
    ]
  }
  if (rol === 'oficinista') {
    return [
      { to: '/oficinista/venta', label: 'Venta en Taquilla', desc: 'Emisión de boletos', icon: '🎟️' },
      { to: '/oficinista/aprobar-pago', label: 'Aprobación de Pagos', desc: 'Validar transferencias', icon: '💳' },
      { to: '/reportes', label: 'Reportes Diarios', desc: 'Arqueo y ventas', icon: '📊' },
    ]
  }
  if (rol === 'chofer') {
    return [
      { to: '/chofer/validar-qr', label: 'Escanear QR', desc: 'Control de abordaje', icon: '📷' },
    ]
  }
  return [
    { to: '/cliente/buscar-rutas', label: 'Buscar Rutas', desc: 'Comprar pasajes en línea', icon: '🔍' },
    { to: '/cliente/mis-boletos', label: 'Mis Boletos', desc: 'Boletos activos y QR', icon: '🎫' },
  ]
})
</script>
