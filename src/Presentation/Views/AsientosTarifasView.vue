<script setup lang="ts">
import { ref, computed } from 'vue';
import CardBase from '../Components/CardBase.vue';
import MetricCard from '../Components/MetricCard.vue';
import SelectorAsientosBus, { type AsientoVisual } from '../Components/SelectorAsientosBus.vue';
import { useFeedback } from '../Composables/useFeedback';

const { showInfo } = useFeedback();

const asientoSeleccionado = ref<AsientoVisual | null>(null);
const ocupadosSimulados = ref<(number | string)[]>(['P1-2', 'P1-5', 'P2-14', 'P2-18']);

const totalAsientos = 36;
const totalOcupados = computed(() => ocupadosSimulados.value.length);
const totalLibres = computed(() => totalAsientos - totalOcupados.value);

const handleSeleccionarAsiento = (asiento: AsientoVisual) => {
  showInfo(`Asiento Nº ${asiento.numero} (${asiento.tipoNombre}) seleccionado por $${asiento.precioBase.toFixed(2)}`);
};
</script>

<template>
  <div class="space-y-6">
    <!-- Tarjetas de Métricas del Sistema de Diseño -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Asientos"
        :value="totalAsientos"
        icon="🪑"
        description="Capacidad total configurada"
      />
      <MetricCard
        title="Disponibles"
        :value="totalLibres"
        icon="✅"
        variant="success"
        description="Listos para reserva"
      />
      <MetricCard
        title="Ocupados"
        :value="totalOcupados"
        icon="🚫"
        variant="danger"
        description="Boletos emitidos"
      />
      <MetricCard
        title="Tarifas Activas"
        value="$10 - $15"
        icon="🏷️"
        variant="info"
        description="Normal $10.00 · VIP $15.00"
      />
    </div>

    <CardBase
      title="Gestión de Asientos y Tarifas"
      subtitle="Consulta las tarifas y selecciona un asiento disponible en el mapa interactivo."
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
          Vista de demostración: los asientos ocupados mostrados corresponden a reservas simuladas.
        </p>
      </template>
    </CardBase>
  </div>
</template>
