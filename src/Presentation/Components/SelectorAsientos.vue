<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h4 class="text-sm font-bold text-slate-900">Mapa de asientos</h4>
        <p class="text-xs text-slate-500">
          {{ disponibles }} disponibles · {{ seleccionados.length }} seleccionados
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
        <span
          v-for="tipo in tiposDisponibles"
          :key="tipo"
          class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1 sm:px-2.5"
        >
          <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: colorTipo(tipo) }" />
          {{ tipo }} · ${{ formatearPrecio(preciosPorTipo[tipo] ?? 0) }}
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1 sm:px-2.5">
          <span class="h-2.5 w-2.5 rounded-full bg-slate-300" />
          Ocupado
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1 sm:px-2.5">
          <span class="h-2.5 w-2.5 rounded-full bg-blue-600" />
          Seleccionado
        </span>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-sm text-slate-500">
      <span class="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      Cargando mapa de asientos…
    </div>

    <div v-else-if="!asientos.length" class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-sm text-slate-500">
      Este bus todavía no tiene asientos configurados.
    </div>

    <div v-else class="space-y-6">
      <div
        v-for="piso in pisos"
        :key="piso.numero"
        class="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4"
      >
        <div class="mb-3 flex items-center justify-between sm:mb-4">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500">
            {{ pisos.length > 1 ? `Piso ${piso.numero}` : 'Distribución del bus' }}
          </span>
          <span class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <span>🧭</span> Frente
          </span>
        </div>

        <div class="mx-auto w-full max-w-md space-y-2">
          <div
            v-for="fila in piso.filas"
            :key="`${piso.numero}-${fila.numero}`"
            class="grid items-center gap-2"
            :style="{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr)) 1.25rem repeat(2, minmax(0, 1fr))' }"
          >
            <button
              v-for="asiento in fila.izquierda"
              :key="asiento.id ?? asiento.numeroAsiento"
              type="button"
              class="relative flex h-10 min-w-0 touch-manipulation items-center justify-center rounded-xl border text-[11px] font-black transition-all duration-150 sm:h-11 sm:text-xs"
              :class="claseAsiento(asiento)"
              :style="estiloAsiento(asiento)"
              :disabled="ocupado(asiento)"
              :title="tituloAsiento(asiento)"
              :aria-pressed="seleccionado(asiento)"
              @click="emit('toggle', asiento)"
            >
              {{ asiento.numeroAsiento }}
            </button>

            <div aria-hidden="true" />

            <button
              v-for="asiento in fila.derecha"
              :key="asiento.id ?? asiento.numeroAsiento"
              type="button"
              class="relative flex h-10 min-w-0 touch-manipulation items-center justify-center rounded-xl border text-[11px] font-black transition-all duration-150 sm:h-11 sm:text-xs"
              :class="claseAsiento(asiento)"
              :style="estiloAsiento(asiento)"
              :disabled="ocupado(asiento)"
              :title="tituloAsiento(asiento)"
              :aria-pressed="seleccionado(asiento)"
              @click="emit('toggle', asiento)"
            >
              {{ asiento.numeroAsiento }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <p class="text-[11px] leading-relaxed text-slate-400">
      Los asientos ocupados ya tienen un boleto emitido o en proceso de validación
      para esta ruta. La disponibilidad se vuelve a verificar al confirmar la compra.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
    return 'cursor-pointer border-blue-700 bg-blue-600 text-white shadow-md shadow-blue-200 scale-105'
  }
  return 'cursor-pointer border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-sm'
}

function estiloAsiento(asiento: Asiento): Record<string, string> {
  if (ocupado(asiento) || seleccionado(asiento)) return {}
  return { borderBottomColor: colorTipo(asiento.tipo) }
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
