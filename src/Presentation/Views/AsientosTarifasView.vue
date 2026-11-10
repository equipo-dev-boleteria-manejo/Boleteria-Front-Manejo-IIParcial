<script setup lang="ts">
import { ref, computed } from 'vue';
import CardBase from '../Components/CardBase.vue';
import MetricCard from '../Components/MetricCard.vue';
import ButtonBase from '../Components/ButtonBase.vue';
import SelectorAsientosBus, {
  type AsientoVisual,
} from '../Components/SelectorAsientosBus.vue';
import SelectorDescuentoPasajero, {
  type PasajeroData,
} from '../Components/SelectorDescuentoPasajero.vue';
import ModalPagoBoleto from '../Components/ModalPagoBoleto.vue';
import { useFeedback } from '../Composables/useFeedback';

const { showSuccess, showInfo } = useFeedback();

const asientoSeleccionado = ref<AsientoVisual | null>(null);
const ocupadosSimulados = ref<(number | string)>([
  'P1-2',
  'P1-5',
  'P2-14',
  'P2-18',
]);

const pasajero = ref<PasajeroData>({
  cedula: '',
  nombres: '',
  categoria: 'GENERAL',
  tieneDiscapacidad: false,
  edad: 30,
});

const mostrarModalPago = ref(false);
const ultimaReserva = ref<{
  asientoNumero: number | string;
  asientoTipo: string;
  pasajeroNombres: string;
  metodoPago: string;
  total: number;
  referencia: string;
  estado: string;
} | null>(null);

const totalAsientos = 36;
const totalOcupados = computed(() => ocupadosSimulados.value.length);
const totalLibres = computed(() => totalAsientos - totalOcupados.value);

const precioBaseSeleccionado = computed(() => {
  return asientoSeleccionado.value ? asientoSeleccionado.value.precioBase : 0;
});

const porcentajeDescuento = computed(() => {
  if (pasajero.value.categoria === 'TERCERA_EDAD' || pasajero.value.categoria === 'DISCAPACIDAD' || pasajero.value.categoria === 'MENOR') {
    return 0.5;
  }
  return 0;
});

const montoTotal = computed(() => {
  const base = precioBaseSeleccionado.value;
  const descuento = base * porcentajeDescuento.value;
  return Math.max(base - descuento, 0);
});

const handleSeleccionarAsiento = (asiento: AsientoVisual) => {
  showInfo(
    `Asiento Nº ${asiento.numero} (${asiento.tipoNombre}) seleccionado por $${asiento.precioBase.toFixed(2)}`,
  );
};

const handleAbrirPago = () => {
  if (!asientoSeleccionado.value) return;
  mostrarModalPago.value = true;
};

const handlePagoConfirmado = (data: {
  metodoPago: 'Transferencia' | 'Tarjeta';
  referencia: string;
  comprobanteNombre?: string;
  estado: 'PAGADO' | 'EN_VALIDACION';
}) => {
  if (!asientoSeleccionado.value) return;

  const asientoId = asientoSeleccionado.value.id;
  if (!ocupadosSimulados.value.includes(asientoId)) {
    ocupadosSimulados.value = [...ocupadosSimulados.value, asientoId];
  }

  ultimaReserva.value = {
    asientoNumero: asientoSeleccionado.value.numero,
    asientoTipo: asientoSeleccionado.value.tipoNombre,
    pasajeroNombres: pasajero.value.nombres || 'Pasajero General',
    metodoPago: data.metodoPago,
    total: montoTotal.value,
    referencia: data.referencia,
    estado: data.estado,
  };

  mostrarModalPago.value = false;
  asientoSeleccionado.value = null;

  showSuccess(
    data.estado === 'PAGADO'
      ? `¡Pago exitoso vía Tarjeta (Stripe)! Boleto emitido.`
      : `Comprobante registrado. Boleto en estado EN VALIDACIÓN para aprobación.`
  );
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

    <!-- Confirmación de Última Compra / Reserva Exitosa -->
    <div
      v-if="ultimaReserva"
      class="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm transition-all"
    >
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">✓</span>
            <h4 class="font-bold text-emerald-950 text-sm">
              {{ ultimaReserva.estado === 'PAGADO' ? 'Boleto Emitido y Pagado con Éxito' : 'Boleto en Proceso de Validación' }}
            </h4>
          </div>
          <p class="text-xs text-emerald-800">
            Asiento Nº <strong>{{ ultimaReserva.asientoNumero }}</strong> ({{ ultimaReserva.asientoTipo }}) para
            <strong>{{ ultimaReserva.pasajeroNombres }}</strong> · Método: <strong>{{ ultimaReserva.metodoPago }}</strong> · Ref: <code class="font-mono bg-white/70 px-1 py-0.5 rounded">{{ ultimaReserva.referencia }}</code>
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-base font-black text-emerald-900">${{ ultimaReserva.total.toFixed(2) }}</span>
          <ButtonBase variant="outline" size="sm" @click="ultimaReserva = null">
            Cerrar aviso
          </ButtonBase>
        </div>
      </div>
    </div>

    <!-- Selector de Asientos Interactivo -->
    <SelectorAsientosBus
      v-model="asientoSeleccionado"
      :asientos-ocupados-ids="ocupadosSimulados"
      @seleccionar-asiento="handleSeleccionarAsiento"
    />

    <!-- Panel de Acción: Descuentos y Pago del Asiento Seleccionado -->
    <div v-if="asientoSeleccionado" class="space-y-4">
      <SelectorDescuentoPasajero
        v-model="pasajero"
        :precio-base="asientoSeleccionado.precioBase"
      />

      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
        <div class="text-xs text-slate-600">
          <p>
            Asiento Nº <strong>{{ asientoSeleccionado.numero }}</strong> ({{ asientoSeleccionado.tipoNombre }}) listo para emisión.
          </p>
          <p class="text-slate-500">
            Haga clic en continuar para seleccionar pago con Tarjeta (Stripe) o Transferencia Bancaria.
          </p>
        </div>
        <ButtonBase
          variant="primary"
          class="w-full sm:w-auto font-bold px-6 py-2.5 shadow-md shadow-blue-500/20"
          @click="handleAbrirPago"
        >
          Proceder al Pago (${{ montoTotal.toFixed(2) }}) →
        </ButtonBase>
      </div>
    </div>

    <!-- Modal de Pago y Confirmación -->
    <ModalPagoBoleto
      v-if="asientoSeleccionado"
      :model-value="mostrarModalPago"
      :asiento-numero="asientoSeleccionado.numero"
      :asiento-tipo="asientoSeleccionado.tipoNombre"
      :piso="asientoSeleccionado.piso"
      :pasajero="pasajero"
      :monto-total="montoTotal"
      @update:model-value="mostrarModalPago = $event"
      @close="mostrarModalPago = false"
      @confirmado="handlePagoConfirmado"
    />

    <p class="text-center text-xs text-slate-400">
      Boletería Front · Sistema Oficial de Transporte Interprovincial del Ecuador
    </p>
  </div>
</template>
