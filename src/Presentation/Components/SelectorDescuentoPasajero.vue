<script setup lang="ts">
import { computed } from 'vue';
import InputBase from './InputBase.vue';

export type CategoriaPasajero = 'GENERAL' | 'TERCERA_EDAD' | 'DISCAPACIDAD' | 'MENOR';

export interface PasajeroData {
  cedula: string;
  nombres: string;
  categoria: CategoriaPasajero;
  tieneDiscapacidad: boolean;
  edad: number;
}

const props = defineProps<{
  modelValue: PasajeroData;
  precioBase: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: PasajeroData): void;
}>();

const opcionesCategoria = [
  { id: 'GENERAL', label: 'General (Adulto)', desc: 'Tarifa completa', descuento: 0 },
  { id: 'TERCERA_EDAD', label: 'Tercera Edad (65+)', desc: '50% Descuento legal', descuento: 0.5 },
  { id: 'DISCAPACIDAD', label: 'Discapacidad / CONADIS', desc: '50% Descuento legal', descuento: 0.5 },
  { id: 'MENOR', label: 'Niño / Menor', desc: '50% Descuento legal', descuento: 0.5 },
] as const;

const categoriaActual = computed(() => props.modelValue.categoria);

const handleSelectCategoria = (cat: CategoriaPasajero) => {
  const isDiscapacidad = cat === 'DISCAPACIDAD';
  let edad = 30;
  if (cat === 'TERCERA_EDAD') edad = 68;
  if (cat === 'MENOR') edad = 8;

  emit('update:modelValue', {
    ...props.modelValue,
    categoria: cat,
    tieneDiscapacidad: isDiscapacidad,
    edad,
  });
};

const handleUpdateField = (field: 'cedula' | 'nombres', val: string) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: val,
  });
};

const porcentajeDescuento = computed(() => {
  const opt = opcionesCategoria.find(o => o.id === props.modelValue.categoria);
  return opt ? opt.descuento : 0;
});

const montoDescuento = computed(() => props.precioBase * porcentajeDescuento.value);
const precioFinal = computed(() => Math.max(props.precioBase - montoDescuento.value, 0));
</script>

<template>
  <div class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex items-center justify-between border-b border-slate-100 pb-3">
      <div>
        <h4 class="text-sm font-bold text-slate-800">Categoría del Pasajero y Descuentos</h4>
        <p class="text-xs text-slate-500">Seleccione si aplica tarifa preferencial según Ley de Transporte de Ecuador</p>
      </div>
      <div v-if="porcentajeDescuento > 0" class="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 border border-emerald-200">
        <span>-50% APLICADO</span>
      </div>
    </div>

    <!-- Selector de Categoría en Tarjetas -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
      <button
        v-for="opcion in opcionesCategoria"
        :key="opcion.id"
        type="button"
        @click="handleSelectCategoria(opcion.id)"
        class="flex flex-col text-left p-3 rounded-xl border transition-all text-xs"
        :class="[
          categoriaActual === opcion.id
            ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-sm'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white text-slate-700'
        ]"
      >
        <div class="flex items-center justify-between w-full">
          <span class="font-bold" :class="categoriaActual === opcion.id ? 'text-blue-900' : 'text-slate-800'">
            {{ opcion.label }}
          </span>
          <span
            v-if="opcion.descuento > 0"
            class="text-[10px] font-black px-1.5 py-0.5 rounded"
            :class="categoriaActual === opcion.id ? 'bg-blue-600 text-white' : 'bg-emerald-100 text-emerald-800'"
          >
            -50%
          </span>
        </div>
        <span class="text-[11px] mt-1 text-slate-500">
          {{ opcion.desc }}
        </span>
      </button>
    </div>

    <!-- Campos de Cédula y Nombres del Pasajero -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
      <InputBase
        label="Cédula de Identidad"
        placeholder="Ej: 1804567890"
        :model-value="modelValue.cedula"
        @update:model-value="handleUpdateField('cedula', $event)"
        maxlength="10"
      />
      <InputBase
        label="Nombres y Apellidos"
        placeholder="Ej: Juan Pérez"
        :model-value="modelValue.nombres"
        @update:model-value="handleUpdateField('nombres', $event)"
      />
    </div>

    <!-- Desglose de Tarifa -->
    <div class="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs">
      <div class="space-y-0.5">
        <p class="text-slate-500">Tarifa Base: <span class="font-semibold text-slate-700">${{ precioBase.toFixed(2) }}</span></p>
        <p v-if="montoDescuento > 0" class="text-emerald-600 font-semibold">
          Descuento Ley (-50%): -${{ montoDescuento.toFixed(2) }}
        </p>
      </div>
      <div class="text-right">
        <span class="text-[10px] uppercase font-bold text-slate-400 block">Total a Cancelar</span>
        <span class="text-base font-black text-blue-700">${{ precioFinal.toFixed(2) }}</span>
      </div>
    </div>
  </div>
</template>
