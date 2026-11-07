<template>
  <div class="space-y-6">
    <CardBase
      title="Mis Boletos y Pasajes"
      subtitle="Historial de compras y descarga de comprobantes"
    >
      <form class="grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]" @submit.prevent="buscar">
        <InputBase
          v-model="cedula"
          label="Cédula del pasajero"
          placeholder="10 dígitos"
          :maxlength="10"
          inputmode="numeric"
          autocomplete="off"
        />
        <ButtonBase type="submit" :loading="loading" :disabled="loading">
          <span aria-hidden="true">🔎</span>
          Consultar boletos
        </ButtonBase>
      </form>

      <p class="mt-3 text-[11px] leading-relaxed text-slate-400">
        Consulta con la cédula registrada al momento de la compra. Si iniciaste sesión,
        usamos automáticamente la cédula de tu perfil.
      </p>
    </CardBase>

    <div
      v-if="errorCarga"
      class="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
    >
      <span aria-hidden="true">⚠️</span>
      <span>{{ errorCarga }}</span>
    </div>

    <div
      v-if="loading && !boletos.length"
      class="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-sm text-slate-500"
    >
      <span class="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      Buscando tus boletos…
    </div>

    <template v-else>
      <div v-if="boletos.length" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Boletos</p>
          <p class="text-2xl font-black leading-tight text-slate-900">{{ totalBoletos }}</p>
          <p class="text-[11px] text-slate-500">En {{ grupos.length }} compra(s)</p>
        </div>
        <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p class="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Emitidos</p>
          <p class="text-2xl font-black leading-tight text-emerald-800">{{ boletosEmitidos }}</p>
          <p class="text-[11px] text-emerald-700/80">Listos para abordar</p>
        </div>
        <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p class="text-[10px] font-bold uppercase tracking-wider text-amber-700">Por validar</p>
          <p class="text-2xl font-black leading-tight text-amber-800">{{ boletosPendientes }}</p>
          <p class="text-[11px] text-amber-700/80">Esperando aprobación</p>
        </div>
      </div>

      <div
        v-if="!grupos.length && !loading"
        class="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center"
      >
        <span class="block text-4xl" aria-hidden="true">🎫</span>
        <h3 class="mt-2 text-sm font-bold text-slate-700">No encontramos boletos</h3>
        <p class="mt-1 text-xs text-slate-500">
          Revisa que la cédula sea correcta o realiza una compra en la sección de búsqueda de rutas.
        </p>
      </div>

      <div v-else class="space-y-4">
        <CardBase
          v-for="grupo in grupos"
          :key="grupo.ventaId"
          hover
          padding="sm"
          class="overflow-hidden"
        >
          <div class="space-y-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Venta #{{ grupo.ventaId }} · Ruta #{{ grupo.rutaId }}
                </p>
                <h3 class="mt-0.5 text-base font-black leading-tight text-slate-900">
                  {{ etiquetaRuta(grupo) }}
                </h3>
                <p class="mt-1 text-xs font-semibold text-slate-500">
                  {{ formatearFechaGrupo(grupo) }}
                  <span v-if="grupo.ruta?.horaSalida"> · Salida {{ formatearHora(grupo.ruta.horaSalida) }}</span>
                </p>
              </div>

              <div class="flex flex-col items-end gap-2">
                <span
                  class="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                  :class="claseEstado(grupo.estado)"
                >
                  {{ grupo.estado }}
                </span>
                <p class="text-lg font-black text-slate-900">${{ formatearPrecio(grupo.total) }}</p>
              </div>
            </div>

            <div class="divide-y divide-slate-100 rounded-2xl border border-slate-200">
              <div
                v-for="boleto in grupo.boletos"
                :key="boleto.id ?? `${grupo.ventaId}-${boleto.asientoId}`"
                class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
              >
                <div class="flex items-center gap-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-[11px] font-black text-white">
                    {{ boleto.asientoId }}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate font-bold text-slate-900">
                      {{ boleto.nombresPasajero }} {{ boleto.apellidosPasajero }}
                    </p>
                    <p class="text-[11px] text-slate-500">
                      {{ boleto.cedulaPasajero }} · {{ boleto.tipoPasajero }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <span
                    class="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                    :class="claseEstado(boleto.estado)"
                  >
                    {{ boleto.estado }}
                  </span>
                  <span class="font-black text-slate-900">${{ formatearPrecio(boleto.precioFinal) }}</span>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-[11px] text-slate-400">
                {{ grupo.boletos.length }} {{ grupo.boletos.length === 1 ? 'boleto' : 'boletos' }} en esta compra
              </p>
              <ButtonBase size="sm" variant="outline" @click="abrirComprobante(grupo)">
                <span aria-hidden="true">🧾</span>
                Ver comprobante
              </ButtonBase>
            </div>
          </div>
        </CardBase>
      </div>
    </template>

    <ComprobanteBoletoModal
      v-model="mostrarComprobante"
      :boletos="boletosSeleccionados"
      :contexto="comprobanteContexto"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CardBase from '../../Components/CardBase.vue'
import InputBase from '../../Components/InputBase.vue'
import ButtonBase from '../../Components/ButtonBase.vue'
import ComprobanteBoletoModal from '../../Components/ComprobanteBoletoModal.vue'
import { useAuthStore } from '../../Store/authStore'
import { useTickets } from '../../Composables/useTickets'
import { useRutas } from '../../Composables/useRutas'
import type { Boleto } from '../../../Domain/Entities/Boleto'
import type { RutaDisponible } from '../../Utils/rutasDisponibles'
import {
  construirRutasDisponibles,
  formatearHora,
} from '../../Utils/rutasDisponibles'
import {
  MENSAJE_SUPABASE_NO_CONFIGURADO,
  obtenerMensajeError,
  supabaseConfigurado,
} from '../../Utils/configuracion'

interface GrupoBoletos {
  ventaId: number
  rutaId: number
  boletos: Boleto[]
  total: number
  estado: string
  creadoEn: number
  ruta: RutaDisponible | null
}

interface ContextoComprobanteVista {
  origen?: string
  destino?: string
  fecha?: string
  horaSalida?: string
  estado?: string
  total?: number
  ventaId?: number
}

const authStore = useAuthStore()
const { boletos, loading, gruposPorVenta, totalBoletos, cargarHistorial } = useTickets()
const {
  rutas,
  buses,
  frecuencias,
  cargarRutas,
  cargarBuses,
  cargarFrecuencias,
} = useRutas()

const cedula = ref(authStore.user?.cedula ?? '')
const errorCarga = ref<string | null>(null)
const mostrarComprobante = ref(false)
const grupoSeleccionado = ref<GrupoBoletos | null>(null)

const rutasPorId = computed(() => {
  const mapa = new Map<number, RutaDisponible>()
  construirRutasDisponibles(rutas.value, frecuencias.value, buses.value, {
    incluirNoVendibles: true,
  }).forEach((item) => {
    if (item.ruta.id !== undefined) mapa.set(item.ruta.id, item)
  })
  return mapa
})

const grupos = computed<GrupoBoletos[]>(() =>
  gruposPorVenta.value.map((grupo) => ({
    ...grupo,
    ruta: rutasPorId.value.get(grupo.rutaId) ?? null,
  })),
)

const boletosEmitidos = computed(
  () =>
    boletos.value.filter((boleto) => {
      const estado = String(boleto.estado ?? '').toLowerCase()
      return (
        estado.includes('emitido') ||
        estado.includes('aprobado') ||
        estado.includes('abordado')
      )
    }).length,
)

const boletosPendientes = computed(
  () =>
    boletos.value.filter((boleto) => {
      const estado = String(boleto.estado ?? '').toLowerCase()
      return estado.includes('proceso') || estado.includes('pendiente')
    }).length,
)

const boletosSeleccionados = computed(() => grupoSeleccionado.value?.boletos ?? [])

const comprobanteContexto = computed<ContextoComprobanteVista | null>(() => {
  const grupo = grupoSeleccionado.value
  if (!grupo) return null

  return {
    origen: grupo.ruta?.origen,
    destino: grupo.ruta?.destino,
    fecha: grupo.ruta?.fecha,
    horaSalida: grupo.ruta?.horaSalida,
    estado: grupo.estado,
    total: grupo.total,
    ventaId: grupo.ventaId,
  }
})

function formatearPrecio(valor: number): string {
  return Number(valor ?? 0).toFixed(2)
}

function etiquetaRuta(grupo: GrupoBoletos): string {
  if (!grupo.ruta) return `Ruta #${grupo.rutaId}`
  return `${grupo.ruta.origen} → ${grupo.ruta.destino}`
}

function formatearFechaGrupo(grupo: GrupoBoletos): string {
  const fecha = grupo.ruta?.fecha
  if (fecha) {
    const fechaDate = new Date(`${fecha}T00:00:00`)
    if (!Number.isNaN(fechaDate.getTime())) {
      return fechaDate.toLocaleDateString('es-EC', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    }
  }

  const creado = grupo.boletos.find((boleto) => boleto.createdAt)?.createdAt
  if (creado) {
    const fechaDate = new Date(creado)
    if (!Number.isNaN(fechaDate.getTime())) {
      return fechaDate.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    }
  }

  return 'Fecha por confirmar'
}

function claseEstado(valor: string): string {
  const estado = String(valor ?? '').toLowerCase()
  if (estado.includes('cancel')) {
    return 'bg-red-50 text-red-700 ring-1 ring-red-200'
  }
  if (estado.includes('proceso') || estado.includes('pendiente')) {
    return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  }
  if (estado.includes('abord')) {
    return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
  }
  return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
}

async function cargarCatalogoRutas(): Promise<void> {
  try {
    await Promise.all([cargarRutas(), cargarFrecuencias(), cargarBuses()])
  } catch {
    /* El catálogo de rutas solo enriquece la vista; no bloquea los boletos. */
  }
}

async function cargarHistorialActual(): Promise<void> {
  const valor = cedula.value.replace(/\D/g, '').trim()
  cedula.value = valor

  if (!supabaseConfigurado) {
    errorCarga.value = MENSAJE_SUPABASE_NO_CONFIGURADO
    return
  }
  if (!valor) {
    errorCarga.value = 'Ingresa la cédula del pasajero para consultar sus boletos.'
    return
  }

  errorCarga.value = null
  try {
    await cargarHistorial(valor)
  } catch (error) {
    errorCarga.value = obtenerMensajeError(
      error,
      'No se pudo cargar el historial de boletos.',
    )
  }
}

function buscar(): void {
  void cargarHistorialActual()
}

function abrirComprobante(grupo: GrupoBoletos): void {
  grupoSeleccionado.value = grupo
  mostrarComprobante.value = true
}

onMounted(() => {
  if (!supabaseConfigurado) {
    errorCarga.value = MENSAJE_SUPABASE_NO_CONFIGURADO
    return
  }

  void cargarCatalogoRutas()

  if (cedula.value) {
    void cargarHistorialActual()
  }
})
</script>
