<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSeatTypes } from '../Composables/useSeatTypes';

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

const asientosMatrizPiso1 = ref<AsientoVisual[]>([]);
const asientosMatrizPiso2 = ref<AsientoVisual[]>([]);

const inicializarGrillaBus = () => {
  const vipType = seatTypes.value.find((t) => t.nombre.toLowerCase().includes('vip')) || seatTypes.value[0];
  const normalType = seatTypes.value.find((t) => !t.nombre.toLowerCase().includes('vip')) || seatTypes.value[0];

  // Piso 1: 12 Asientos VIP
  asientosMatrizPiso1.value = Array.from({ length: 12 }, (_, i) => {
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

  // Piso 2: 24 Asientos Standard
  asientosMatrizPiso2.value = Array.from({ length: 24 }, (_, i) => {
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
};

onMounted(async () => {
  await cargarTiposAsiento();
  inicializarGrillaBus();
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
  <div class="w-full max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-md border border-slate-200">
    <!-- Header y Selección de Piso -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
      <div>
        <h3 class="text-xl font-bold text-slate-800">Selección de Asiento</h3>
        <p class="text-sm text-slate-500">Elija la ubicación dentro del mapa interactivo del bus</p>
      </div>

      <div v-if="tieneSegundoPiso" class="inline-flex p-1 bg-slate-100 rounded-lg">
        <button
          type="button"
          @click="pisoSeleccionado = 1"
          :class="[
            'px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200',
            pisoSeleccionado === 1 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          ]"
        >
          Piso 1 (VIP)
        </button>
        <button
          type="button"
          @click="pisoSeleccionado = 2"
          :class="[
            'px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200',
            pisoSeleccionado === 2 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          ]"
        >
          Piso 2 (Standard)
        </button>
      </div>
    </div>

    <!-- ESTADO 1: CARGANDO (LOADING SKELETON) -->
    <div v-if="loading" class="animate-pulse space-y-4 py-8">
      <div class="h-8 bg-slate-200 rounded w-1/3 mx-auto"></div>
      <div class="grid grid-cols-4 gap-4 max-w-md mx-auto">
        <div v-for="n in 12" :key="n" class="h-14 bg-slate-200 rounded-lg"></div>
      </div>
    </div>

    <!-- ESTADO 2: ERROR -->
    <div v-else-if="error" class="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-md mb-4">
      <div class="flex items-center">
        <p class="text-sm font-medium text-red-800">Error al cargar tipos de asiento: {{ error }}</p>
      </div>
    </div>

    <!-- ESTADO 3: VACÍO (EMPTY STATE) -->
    <div v-else-if="!tieneTiposAsiento" class="text-center py-10 px-4">
      <p class="text-base font-semibold text-slate-600">No hay configuración de asientos disponible para este bus.</p>
    </div>

    <!-- ESTADO 4: ÉXITO (GRILLA INTERACTIVA 2D) -->
    <div v-else class="space-y-6">
      <!-- Leyenda de Estados -->
      <div class="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 rounded border border-slate-300 bg-white"></span> Libre
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 rounded bg-amber-500"></span> VIP
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 rounded bg-emerald-600"></span> Seleccionado
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 rounded bg-slate-300"></span> Ocupado
        </div>
      </div>

      <!-- Esquema 2D del Bus -->
      <div class="relative mx-auto max-w-md p-6 bg-slate-50 rounded-3xl border-2 border-slate-200 shadow-inner">
        <div class="flex justify-end mb-6 pb-2 border-b-2 border-dashed border-slate-300">
          <span class="px-3 py-1 bg-slate-200 text-slate-600 text-xs rounded-full font-bold uppercase tracking-wider">
            Frente / Conductor 🚌
          </span>
        </div>

        <!-- Matriz de Asientos -->
        <div class="grid grid-cols-4 gap-3">
          <template v-for="(asiento, index) in asientosFiltradosPorPiso" :key="asiento.id">
            <div
              v-if="index > 0 && index % 2 === 0 && index % 4 !== 0"
              class="col-span-4 h-0"
              aria-hidden="true"
            ></div>

            <button
              type="button"
              :disabled="asiento.estaOcupado || deshabilitado"
              @click="seleccionarAsiento(asiento)"
              :class="[
                'relative h-14 rounded-lg font-bold text-xs flex flex-col items-center justify-center transition-all duration-150 border',
                asiento.estaOcupado
                  ? 'bg-slate-300 border-slate-400 text-slate-500 cursor-not-allowed opacity-60'
                  : asientoSeleccionado?.id === asiento.id
                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-lg scale-105 ring-2 ring-emerald-300'
                  : asiento.esVip
                  ? 'bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200'
                  : 'bg-white border-slate-300 text-slate-700 hover:border-blue-500 hover:text-blue-600'
              ]"
            >
              <span>Nº {{ asiento.numero }}</span>
              <span class="text-[10px] font-normal opacity-80">${{ asiento.precioBase.toFixed(2) }}</span>
            </button>
          </template>
        </div>
      </div>

      <!-- Resumen del Asiento Seleccionado -->
      <div v-if="asientoSeleccionado" class="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center">
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