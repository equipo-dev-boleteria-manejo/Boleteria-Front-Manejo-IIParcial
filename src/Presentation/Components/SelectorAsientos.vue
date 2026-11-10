<template>
  <div class="space-y-5">
    <!-- Header del selector con conteos y leyenda -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h4 class="text-sm font-bold text-slate-900">Distribución de Asientos</h4>
        <p class="text-xs text-slate-500">
          {{ disponibles }} disponibles · {{ seleccionados.length }} seleccionados
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
        <span
          v-for="tipo in tiposDisponibles"
          :key="tipo"
          class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-2xs"
        >
          <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: colorTipo(tipo) }" />
          {{ tipo }} · ${{ formatearPrecio(preciosPorTipo[tipo] ?? 0) }}
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-2xs">
          <span class="h-2.5 w-2.5 rounded-full bg-slate-300" />
          Ocupado
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700 shadow-2xs">
          <span class="h-2.5 w-2.5 rounded-full bg-blue-600" />
          Seleccionado
        </span>
      </div>
    </div>

    <!-- Selector de Pisos (Tabs como la arquitectura de Daniela) -->
    <div
      v-if="pisos.length > 1"
      class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2"
      role="group"
      aria-label="Seleccionar piso del bus"
    >
      <div class="flex items-center gap-2 pl-2">
        <span class="text-sm">🚌</span>
        <span class="text-xs font-bold text-slate-700">Nivel a visualizar:</span>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="piso in pisos"
          :key="piso.numero"
          type="button"
          class="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all"
          :class="
            pisoActivoNumero === piso.numero
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-600 ring-offset-1'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          "
          @click="pisoActivoNumero = piso.numero"
        >
          <span>{{ piso.numero === 1 ? '⭐ Piso 1 (VIP)' : '💺 Piso 2 (Estándar)' }}</span>
          <span
            class="rounded-full px-1.5 py-0.5 text-[10px] font-black"
            :class="pisoActivoNumero === piso.numero ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'"
          >
            {{ totalAsientosPiso(piso) }}
          </span>
        </button>
      </div>
    </div>

    <!-- Estado cargando -->
    <div v-if="loading" class="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-sm text-slate-500">
      <span class="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      Cargando mapa de asientos…
    </div>

    <!-- Estado vacío -->
    <div v-else-if="!asientos.length" class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-sm text-slate-500">
      Este bus todavía no tiene asientos configurados.
    </div>

    <!-- Chasis visual del Bus -->
    <div v-else-if="pisoActivo" class="rounded-3xl border-2 border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <!-- Frente del bus / Cabina -->
      <div class="mb-5 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 p-3 sm:p-4">
        <div class="flex items-center justify-between text-xs font-bold text-slate-700">
          <div class="flex items-center gap-2">
            <span class="text-base">🚌</span>
            <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
              {{ pisoActivo.numero === 1 ? 'Piso 1 · Frente del Bus' : 'Piso 2 · Nivel Panorámico' }}
            </span>
          </div>
          <div class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-2xs">
            <span>{{ pisoActivo.numero === 1 ? '💺 Volante Conductor' : '🔭 Vista Frontal' }}</span>
          </div>
        </div>
      </div>

      <!-- Distribución de Asientos con Pasillo Central -->
      <div class="mx-auto w-full max-w-sm space-y-2.5">
        <div
          v-for="fila in pisoActivo.filas"
          :key="`${pisoActivo.numero}-${fila.numero}`"
          class="grid items-center gap-2"
          :style="{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr)) 1.75rem repeat(2, minmax(0, 1fr))' }"
        >
          <button
            v-for="asiento in fila.izquierda"
            :key="asiento.id ?? asiento.numeroAsiento"
            type="button"
            class="relative flex h-11 min-w-0 touch-manipulation items-center justify-center rounded-xl border text-xs font-black transition-all duration-150 sm:h-12"
            :class="claseAsiento(asiento)"
            :style="estiloAsiento(asiento)"
            :disabled="ocupado(asiento)"
            :title="tituloAsiento(asiento)"
            :aria-pressed="seleccionado(asiento)"
            @click="emit('toggle', asiento)"
          >
            <span>{{ asiento.numeroAsiento }}</span>
            <span
              v-if="esVip(asiento)"
              class="absolute -top-1.5 -right-1 text-[9px] leading-none"
              title="Asiento VIP"
            >
              ⭐
            </span>
          </button>

          <!-- Pasillo Central -->
          <div class="flex h-full items-center justify-center" aria-hidden="true">
            <span class="h-3 w-0.5 rounded-full bg-slate-200"></span>
          </div>

          <button
            v-for="asiento in fila.derecha"
            :key="asiento.id ?? asiento.numeroAsiento"
            type="button"
            class="relative flex h-11 min-w-0 touch-manipulation items-center justify-center rounded-xl border text-xs font-black transition-all duration-150 sm:h-12"
            :class="claseAsiento(asiento)"
            :style="estiloAsiento(asiento)"
            :disabled="ocupado(asiento)"
            :title="tituloAsiento(asiento)"
            :aria-pressed="seleccionado(asiento)"
            @click="emit('toggle', asiento)"
          >
            <span>{{ asiento.numeroAsiento }}</span>
            <span
              v-if="esVip(asiento)"
              class="absolute -top-1.5 -right-1 text-[9px] leading-none"
              title="Asiento VIP"
            >
              ⭐
            </span>
          </button>
        </div>
      </div>

      <!-- Leyenda inferior de piso -->
      <div class="mt-5 border-t border-slate-100 pt-3 text-center text-[11px] font-semibold text-slate-400">
        {{ pisoActivo.numero === 1 ? 'Servicio VIP con asientos reclinables' : 'Servicio Estándar regular' }}
      </div>
    </div>

    <p class="text-[11px] leading-relaxed text-slate-400">
      Los asientos ocupados ya tienen un boleto emitido o en proceso de validación
      para esta ruta. La disponibilidad se vuelve a verificar al confirmar la compra.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Asiento } from '../../Domain/Entities/Asiento'

interface FilaAsientos {
  numero: string
  izquierda: Asiento[]
  derecha: Asiento[]
}

interface PisoAsientos {
  numero: number
  filas: FilaAsientos[]
}

interface Props {
  asientos: Asiento[]
  ocupados?: number[]
  seleccionados?: number[]
  preciosPorTipo?: Record<string, number>
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  ocupados: () => [],
  seleccionados: () => [],
  preciosPorTipo: () => ({}),
  loading: false,
})

const emit = defineEmits<{
  (e: 'toggle', asiento: Asiento): void
}>()

const COLORES_TIPO: Record<string, string> = {
  normal: '#3498db',
  vip: '#e74c3c',
  ejecutivo: '#f39c12',
  executivo: '#f39c12',
}

const pisoActivoNumero = ref<number>(1)

const disponibles = computed(
  () => props.asientos.filter((asiento) => !ocupado(asiento)).length,
)

const tiposDisponibles = computed(() => {
  const tipos = new Set(
    props.asientos
      .filter((asiento) => !ocupado(asiento))
      .map((asiento) => asiento.tipo),
  )
  return Array.from(tipos)
})

const pisos = computed<PisoAsientos[]>(() => {
  const porPiso = new Map<number, Map<string, Asiento[]>>()

  props.asientos.forEach((asiento) => {
    const piso = asiento.piso || 1
    const fila = asiento.fila || asiento.numeroAsiento
    if (!porPiso.has(piso)) porPiso.set(piso, new Map())
    const filas = porPiso.get(piso)!
    if (!filas.has(fila)) filas.set(fila, [])
    filas.get(fila)!.push(asiento)
  })

  return Array.from(porPiso.entries())
    .sort(([a], [b]) => a - b)
    .map(([numero, filas]) => ({
      numero,
      filas: Array.from(filas.entries())
        .sort(([a], [b]) => compararFilas(a, b))
        .map(([fila, asientosFila]) => {
          const ordenados = [...asientosFila].sort((a, b) =>
            a.columna.localeCompare(b.columna),
          )
          const mitad = Math.ceil(ordenados.length / 2)
          return {
            numero: fila,
            izquierda: ordenados.slice(0, mitad),
            derecha: ordenados.slice(mitad),
          }
        }),
    }))
})

// Mantener el piso activo sincronizado cuando cargan o cambian los pisos
watch(
  pisos,
  (nuevosPisos) => {
    if (nuevosPisos.length > 0 && !nuevosPisos.some((p) => p.numero === pisoActivoNumero.value)) {
      pisoActivoNumero.value = nuevosPisos[0].numero
    }
  },
  { immediate: true }
)

const pisoActivo = computed<PisoAsientos | undefined>(() => {
  return pisos.value.find((p) => p.numero === pisoActivoNumero.value) || pisos.value[0]
})

function totalAsientosPiso(piso: PisoAsientos): number {
  return piso.filas.reduce((total, fila) => total + fila.izquierda.length + fila.derecha.length, 0)
}

function esVip(asiento: Asiento): boolean {
  return asiento.tipo?.toLowerCase().includes('vip') || asiento.piso === 1
}

function compararFilas(a: string, b: string): number {
  const numeroA = Number(a)
  const numeroB = Number(b)
  if (Number.isFinite(numeroA) && Number.isFinite(numeroB)) {
    return numeroA - numeroB
  }
  return a.localeCompare(b)
}

function colorTipo(tipo: string): string {
  return COLORES_TIPO[tipo?.toLowerCase()] ?? '#64748b'
}

function seleccionado(asiento: Asiento): boolean {
  return asiento.id !== undefined && props.seleccionados.includes(asiento.id)
}

function ocupado(asiento: Asiento): boolean {
  return (
    asiento.id !== undefined &&
    (props.ocupados.includes(asiento.id) || !asiento.disponible)
  )
}

function claseAsiento(asiento: Asiento): string {
  if (ocupado(asiento)) {
    return 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-400 line-through'
  }
  if (seleccionado(asiento)) {
    return 'cursor-pointer border-blue-700 bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105 ring-2 ring-blue-400'
  }
  if (esVip(asiento)) {
    return 'cursor-pointer border-amber-300 bg-amber-50/60 text-slate-800 hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-sm'
  }
  return 'cursor-pointer border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-sm'
}

function estiloAsiento(asiento: Asiento): Record<string, string> {
  if (ocupado(asiento) || seleccionado(asiento)) return {}
  return { borderBottomColor: colorTipo(asiento.tipo), borderBottomWidth: '3px' }
}

function tituloAsiento(asiento: Asiento): string {
  const precio = props.preciosPorTipo[asiento.tipo]
  const detalle = precio ? ` · $${formatearPrecio(precio)}` : ''
  if (ocupado(asiento)) return `Asiento ${asiento.numeroAsiento} ocupado`
  return `Asiento ${asiento.numeroAsiento} · ${asiento.tipo}${detalle}`
}

function formatearPrecio(valor: number): string {
  return Number(valor).toFixed(2)
}
</script>
