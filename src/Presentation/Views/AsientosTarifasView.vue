<script setup lang="ts">
import { ref } from 'vue';
import AppLayout from '../Components/AppLayout.vue';
import CardBase from '../Components/CardBase.vue';
import SelectorAsientosBus, { type AsientoVisual } from '../Components/SelectorAsientosBus.vue';

const asientoSeleccionado = ref<AsientoVisual | null>(null);
const ocupadosSimulados = ref<(number | string)[]>(['P1-2', 'P1-5', 'P2-14', 'P2-18']);

const handleSeleccionarAsiento = (asiento: AsientoVisual) => {
  console.log('Asiento seleccionado en vista:', asiento);
};
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-7xl space-y-4 font-sans">
      <CardBase
        title="Gestión de Asientos y Tarifas"
        subtitle="Consulta las tarifas y selecciona un asiento disponible."
        padding="lg"
        hover
      >
        <SelectorAsientosBus
          v-model="asientoSeleccionado"
          :asientos-ocupados-ids="ocupadosSimulados"
          @seleccionar-asiento="handleSeleccionarAsiento"
        />

        <template #footer>
          <p class="text-xs leading-relaxed text-slate-500">
            Vista de demostración: los asientos ocupados mostrados son datos simulados.
          </p>
        </template>
      </CardBase>
    </div>
  </AppLayout>
</template>