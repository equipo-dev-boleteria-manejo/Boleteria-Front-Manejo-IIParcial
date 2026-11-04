<script setup lang="ts">
import { ref } from 'vue';
import AppLayout from '../Components/AppLayout.vue';
import SelectorAsientosBus, { AsientoVisual } from '../Components/SelectorAsientosBus.vue';

const asientoSeleccionado = ref<AsientoVisual | null>(null);
const ocupadosSimulados = ref<(number | string)[]>(['P1-2', 'P1-5', 'P2-14', 'P2-18']);

const handleSeleccionarAsiento = (asiento: AsientoVisual) => {
  console.log('Asiento seleccionado en vista:', asiento);
};
</script>

<template>
  <AppLayout>
    <template #default>
      <div class="space-y-6 p-4">
        <div class="border-b border-slate-200 pb-4">
          <h1 class="text-2xl font-bold text-slate-800">Gestión de Asientos y Tarifas</h1>
          <p class="text-sm text-slate-500">Selección interactiva de asientos por bus y consulta de tarifas.</p>
        </div>

        <SelectorAsientosBus
          v-model="asientoSeleccionado"
          :asientos-ocupados-ids="ocupadosSimulados"
          @seleccionar-asiento="handleSeleccionarAsiento"
        />
      </div>
    </template>
  </AppLayout>
</template>