<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSeatTypes } from '../Composables/useSeatTypes';
import ButtonBase from './ButtonBase.vue';

// Estructura visual para la grilla interactiva del bus
export interface AsientoVisual {
  id: number | string;
  numero: string;
  piso: 1 | 2;
  tipoId: number | string;
  tipoNombre: string;
  precioBase: number;
  estaOcupado: boolean;
  esVip: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue?: AsientoVisual | null;
    asientosOcupadosIds?: (number | string)[];
    pisoActivoInicial?: 1 | 2;
    tieneSegundoPiso?: boolean;
    deshabilitado?: boolean;
  }>(),
  {
    modelValue: null,
    asientosOcupadosIds: () => [],
    pisoActivoInicial: 1,
    tieneSegundoPiso: true,
    deshabilitado: false,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', asiento: AsientoVisual | null): void;
  (e: 'seleccionar-asiento', asiento: AsientoVisual): void;
}>();

// Inyección del composable de dominio (sin instanciar la infraestructura en la vista)
const { seatTypes, loading, error, cargarTiposAsiento, tieneTiposAsiento } = useSeatTypes();

const pisoSeleccionado = ref<1 | 2>(props.pisoActivoInicial);
const asientoSeleccionado = ref<AsientoVisual | null>(props.modelValue);

// Reactividad completa de matrices de asientos basadas en seatTypes y props.asientosOcupadosIds
const asientosMatrizPiso1 = computed<AsientoVisual[]>(() => {
  const vipType = seatTypes.value.find((t) => t.nombre.toLowerCase().includes('vip')) || seatTypes.value[0];
  return Array.from({ length: 12 }, (_, i) => {
    const num = i + 1;
    const id = `P1-${num}`;
    return {
      id,
      numero: `${num}`,
      piso: 1,
      tipoId: vipType?.id ?? 1,
      tipoNombre: vipType?.nombre ?? 'VIP',
      precioBase: vipType?.precioBase ?? 15.0,
      estaOcupado: props.asientosOcupadosIds.includes(id) || props.asientosOcupadosIds.includes(num),
      esVip: true,
    };
  });
});

const asientosMatrizPiso2 = computed<AsientoVisual[]>(() => {
  const normalType = seatTypes.value.find((t) => !t.nombre.toLowerCase().includes('vip')) || seatTypes.value[0];
  return Array.from({ length: 24 }, (_, i) => {
    const num = i + 13;
    const id = `P2-${num}`;
    return {
      id,
      numero: `${num}`,
      piso: 2,
      tipoId: normalType?.id ?? 2,
      tipoNombre: normalType?.nombre ?? 'Normal',
      precioBase: normalType?.precioBase ?? 10.0,
      estaOcupado: props.asientosOcupadosIds.includes(id) || props.asientosOcupadosIds.includes(num),
      esVip: false,
    };
  });
});

onMounted(async () => {
  await cargarTiposAsiento();
});

const asientosFiltradosPorPiso = computed(() => {
  return pisoSeleccionado.value === 1 ? asientosMatrizPiso1.value : asientosMatrizPiso2.value;
});

const seleccionarAsiento = (asiento: AsientoVisual) => {
  if (asiento.estaOcupado || props.deshabilitado) return;

  if (asientoSeleccionado.value?.id === asiento.id) {
    asientoSeleccionado.value = null;
  } else {
    asientoSeleccionado.value = asiento;
  }

  emit('update:modelValue', asientoSeleccionado.value);
  if (asientoSeleccionado.value) {
    emit('seleccionar-asiento', asientoSeleccionado.value);
  }
};
</script>

<template>
  <div class="w-full">
    <!-- Header y Selección de Piso -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
      <div>
        <h3 class="text-xl font-bold text-slate-800">Selección de Asiento</h3>
        <p class="text-sm text-slate-500">Elija la ubicación dentro del mapa interactivo del bus</p>
      </div>

      <div v-if="tieneSegundoPiso" class="flex flex-wrap gap-2" role="group" aria-label="Seleccionar piso del bus">
        <ButtonBase
          size="sm"
          :variant="pisoSeleccionado === 1 ? 'primary' : 'outline'"
          :aria-pressed="pisoSeleccionado === 1"
          @click="pisoSeleccionado = 1"
        >
          Piso 1 (VIP)
        </ButtonBase>
        <ButtonBase
          size="sm"
          :variant="pisoSeleccionado === 2 ? 'primary' : 'outline'"
          :aria-pressed="pisoSeleccionado === 2"
          @click="pisoSeleccionado = 2"
        >
          Piso 2 (Standard)
        </ButtonBase>
      </div>
    </div>

    <!-- ESTADO 1: CARGANDO (LOADING SKELETON) -->
    <div v-if="loading" class="animate-pulse space-y-4 py-8" role="status" aria-live="polite">
      <span class="sr-only">Cargando tipos de asiento y tarifas...</span>
      <div class="h-8 bg-slate-200 rounded w-1/3 mx-auto"></div>
      <div class="grid grid-cols-4 gap-4 max-w-md mx-auto">
        <div v-for="n in 12" :key="n" class="h-14 bg-slate-200 rounded-lg"></div>
      </div>
    </div>

    <!-- ESTADO 2: ERROR -->
    <div v-else-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" role="alert">
      <div class="flex items-start gap-2.5">
        <span aria-hidden="true">⚠️</span>
        <p class="font-semibold">Error al cargar tipos de asiento: {{ error }}</p>
      </div>
      <ButtonBase size="sm" variant="outline" @click="cargarTiposAsiento">
        Reintentar
      </ButtonBase>
    </div>

    <!-- ESTADO 3: VACÍO (EMPTY STATE) -->
    <div v-else-if="!tieneTiposAsiento" class="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm" aria-hidden="true">
        🪑
      </div>
      <h4 class="mt-4 text-base font-bold text-slate-800">No hay tarifas configuradas</h4>
      <p class="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
        No hay tipos de asiento activos disponibles para mostrar.
      </p>
    </div>

    <!-- ESTADO 4: ÉXITO (GRILLA INTERACTIVA 2D) -->
    <div v-else class="space-y-6">
      <!-- Leyenda de Estados -->
      <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-semibold text-slate-600" aria-label="Leyenda de estados de asientos">
        <div class="flex items-center gap-2">
          <span class="h-4 w-4 rounded-md border border-slate-300 bg-white" aria-hidden="true"></span> Libre
        </div>
        <div class="flex items-center gap-2">
          <span class="h-4 w-4 rounded-md border border-amber-400 bg-amber-100" aria-hidden="true"></span> VIP
        </div>
        <div class="flex items-center gap-2">
          <span class="h-4 w-4 rounded-md bg-emerald-600" aria-hidden="true"></span> Seleccionado
        </div>
        <div class="flex items-center gap-2">
          <span class="h-4 w-4 rounded-md bg-slate-300" aria-hidden="true"></span> Ocupado
        </div>
      </div>

      <!-- Esquema 2D del Bus -->
      <div class="relative mx-auto max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-inner sm:p-6">
        <div class="flex justify-end mb-6 pb-2 border-b-2 border-dashed border-slate-300">
          <span class="px-3 py-1 bg-slate-200 text-slate-600 text-xs rounded-full font-bold uppercase tracking-wider">
            Frente / Conductor 🚌
          </span>
        </div>

        <!-- Matriz de Asientos con pasillo central (columna 3 de 5) -->
        <div class="grid grid-cols-5 gap-2 sm:gap-3 items-center">
          <template v-for="(asiento, index) in asientosFiltradosPorPiso" :key="asiento.id">
            <button
              type="button"
              :disabled="asiento.estaOcupado || deshabilitado"
              @click="seleccionarAsiento(asiento)"
              :aria-pressed="asientoSeleccionado?.id === asiento.id"
              :aria-label="`Asiento ${asiento.numero}, piso ${asiento.piso}, ${asiento.tipoNombre}, ${asiento.estaOcupado ? 'ocupado' : `disponible por $${asiento.precioBase.toFixed(2)}`}`"
              :class="[
                'relative flex h-14 flex-col items-center justify-center rounded-xl border text-xs font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                asiento.estaOcupado
                  ? 'cursor-not-allowed border-slate-300 bg-slate-200 text-slate-500 opacity-70'
                  : asientoSeleccionado?.id === asiento.id
                  ? 'scale-105 border-emerald-700 bg-emerald-600 text-white shadow-md ring-2 ring-emerald-200'
                  : asiento.esVip
                  ? 'border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400 hover:bg-amber-100'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
              ]"
            >
              <span>Nº {{ asiento.numero }}</span>
              <span class="text-[10px] font-normal opacity-80">${{ asiento.precioBase.toFixed(2) }}</span>
            </button>

            <!-- Pasillo central entre asientos 2 y 3 de cada fila (cada 4 asientos) -->
            <div
              v-if="index % 4 === 1"
              class="flex h-14 items-center justify-center text-[10px] font-semibold text-slate-400"
              aria-hidden="true"
            >
              🚶
            </div>
          </template>
        </div>
      </div>

      <!-- Resumen del Asiento Seleccionado -->
      <div v-if="asientoSeleccionado" class="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Asiento Seleccionado</p>
          <p class="text-sm font-bold text-emerald-900">
            Nº {{ asientoSeleccionado.numero }} - Piso {{ asientoSeleccionado.piso }} ({{ asientoSeleccionado.tipoNombre }})
          </p>
        </div>
        <p class="text-lg font-extrabold text-emerald-800">${{ asientoSeleccionado.precioBase.toFixed(2) }}</p>
      </div>
    </div>
  </div>
</template>
