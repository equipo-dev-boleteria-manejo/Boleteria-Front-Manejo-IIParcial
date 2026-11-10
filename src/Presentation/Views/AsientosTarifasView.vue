<script setup lang="ts">
import { ref, computed } from 'vue';
import MetricCard from '../Components/MetricCard.vue';
import CardBase from '../Components/CardBase.vue';
import SelectorAsientosBus, {
  type AsientoVisual,
} from '../Components/SelectorAsientosBus.vue';
import { useFeedback } from '../Composables/useFeedback';

const { showInfo } = useFeedback();

const asientoSeleccionado = ref<AsientoVisual | null>(null);

// Muestra de distribución estándar de la flota de dos pisos (36 asientos totales)
const ocupadosDemostracion = ref<(number | string)[]>([
  'P1-2',
  'P1-5',
  'P2-14',
  'P2-18',
]);

const totalAsientos = 36;
const capacidadPiso1Vip = 12;
const capacidadPiso2Standard = 24;

const handleSeleccionarAsiento = (asiento: AsientoVisual) => {
  asientoSeleccionado.value = asiento;
  showInfo(
    `Asiento Nº ${asiento.numero} · Piso ${asiento.piso} (${asiento.tipoNombre}) · Tarifa Base: $${asiento.precioBase.toFixed(2)}`,
    3000
  );
};
</script>

<template>
  <div class="space-y-6">
    <!-- Tarjetas de Métricas de la Flota para el Administrador -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Capacidad Total"
        :value="totalAsientos"
        icon="🪑"
        description="36 asientos en dos niveles"
      />
      <MetricCard
        title="Piso 1 (VIP)"
        :value="capacidadPiso1Vip"
        icon="⭐"
        variant="info"
        description="12 asientos reclinables · $15.00"
      />
      <MetricCard
        title="Piso 2 (Standard)"
        :value="capacidadPiso2Standard"
        icon="🚌"
        variant="success"
        description="24 asientos estándar · $10.00"
      />
      <MetricCard
        title="Tarifas Reguladas"
        value="$10 - $15"
        icon="🏷️"
        variant="info"
        description="Diferenciada según ANT"
      />
    </div>

    <!-- Selector / Auditor Visual de la Estructura de Asientos -->
    <SelectorAsientosBus
      v-model="asientoSeleccionado"
      :asientos-ocupados-ids="ocupadosDemostracion"
      @seleccionar-asiento="handleSeleccionarAsiento"
    />

    <!-- Especificación de Tarifas y Reglas para el Administrador -->
    <CardBase
      title="Especificación de Tarifas Base de la Cooperativa"
      subtitle="Parámetros oficiales aplicados automáticamente en taquillas y venta en línea"
      padding="md"
    >
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-800">Piso 1 · Servicio VIP</span>
            <span class="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              $15.00
            </span>
          </div>
          <p class="text-slate-600 leading-relaxed">
            12 Asientos anchos semi-cama (reclinación 160°), climatización individual y tomas USB. Tarifa base sin recargo por reserva.
          </p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-800">Piso 2 · Servicio Estándar</span>
            <span class="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              $10.00
            </span>
          </div>
          <p class="text-slate-600 leading-relaxed">
            24 Asientos anatómicos interprovinciales con cinturón de seguridad de tres puntos y visual panorámica.
          </p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-800">Descuentos de Ley Obligatorios</span>
            <span class="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              -50%
            </span>
          </div>
          <p class="text-slate-600 leading-relaxed">
            Descuento del 50% aplicado en taquilla y venta web para Menores de 12 años, Tercera Edad (65+) y Personas con Discapacidad (CONADIS).
          </p>
        </div>
      </div>
    </CardBase>

    <p class="text-center text-xs text-slate-400">
      Boletería Front · Módulo de Administración de Plantilla de Flota y Tarifas Base
    </p>
  </div>
</template>
