<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import ModalBase from './ModalBase.vue';
import ButtonBase from './ButtonBase.vue';
import InputBase from './InputBase.vue';
import StripePaymentForm from './StripePaymentForm.vue';
import SelectorDescuentoPasajero, {
  type PasajeroData,
} from './SelectorDescuentoPasajero.vue';

const props = defineProps<{
  modelValue: boolean;
  asientoNumero: number | string;
  asientoTipo: string;
  piso: number;
  precioBase: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
  (
    e: 'confirmado',
    data: {
      metodoPago: 'Transferencia' | 'Tarjeta';
      referencia: string;
      comprobanteNombre?: string;
      estado: 'PAGADO' | 'EN_VALIDACION';
      pasajero: PasajeroData;
      total: number;
    }
  ): void;
}>();

const pasajero = ref<PasajeroData>({
  cedula: '',
  nombres: '',
  categoria: 'GENERAL',
  tieneDiscapacidad: false,
  edad: 30,
});

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) {
      metodoSeleccionado.value = 'Tarjeta';
      numeroComprobante.value = '';
      nombreArchivo.value = '';
      errorTransferencia.value = '';
    }
  }
);

const metodoSeleccionado = ref<'Tarjeta' | 'Transferencia'>('Tarjeta');
const numeroComprobante = ref('');
const nombreArchivo = ref('');
const procesandoTransferencia = ref(false);
const errorTransferencia = ref('');

const porcentajeDescuento = computed(() => {
  if (
    pasajero.value.categoria === 'TERCERA_EDAD' ||
    pasajero.value.categoria === 'DISCAPACIDAD' ||
    pasajero.value.categoria === 'MENOR'
  ) {
    return 0.5;
  }
  return 0;
});

const totalFinal = computed(() => {
  const base = props.precioBase;
  const descuento = base * porcentajeDescuento.value;
  return Math.max(base - descuento, 0);
});

const handleArchivoChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    nombreArchivo.value = target.files[0].name;
    errorTransferencia.value = '';
  }
};

const handlePagoTarjetaExitoso = (paymentIntent: any) => {
  emit('confirmado', {
    metodoPago: 'Tarjeta',
    referencia: paymentIntent?.id || `STRIPE_${Date.now()}`,
    estado: 'PAGADO',
    pasajero: { ...pasajero.value },
    total: totalFinal.value,
  });
};

const handleConfirmarTransferencia = () => {
  if (!numeroComprobante.value.trim()) {
    errorTransferencia.value = 'Ingrese el número de comprobante o referencia bancaria.';
    return;
  }

  procesandoTransferencia.value = true;
  errorTransferencia.value = '';

  setTimeout(() => {
    procesandoTransferencia.value = false;
    emit('confirmado', {
      metodoPago: 'Transferencia',
      referencia: numeroComprobante.value.trim(),
      comprobanteNombre: nombreArchivo.value || 'comprobante_bancario.jpg',
      estado: 'EN_VALIDACION',
      pasajero: { ...pasajero.value },
      total: totalFinal.value,
    });
  }, 500);
};
</script>

<template>
  <ModalBase
    :model-value="modelValue"
    title="Reserva y Pago de Asiento"
    maxWidth="2xl"
    @close="emit('close')"
  >
    <div class="space-y-5">
      <!-- Resumen del Asiento Seleccionado -->
      <div class="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span class="text-blue-700 font-bold block uppercase tracking-wider text-[11px]">Asiento Seleccionado</span>
            <p class="font-extrabold text-slate-800 text-base">
              Nº {{ asientoNumero }} · Piso {{ piso }} ({{ asientoTipo }})
            </p>
          </div>
          <div class="sm:text-right">
            <span class="text-slate-500 block">Tarifa Base</span>
            <span class="text-base font-black text-blue-800">${{ precioBase.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- Paso 1: Datos del Pasajero y Descuento por Ley -->
      <SelectorDescuentoPasajero
        v-model="pasajero"
        :precio-base="precioBase"
      />

      <!-- Paso 2: Selección de Método de Pago -->
      <div class="space-y-3 pt-2">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600">
          Seleccione Método de Pago
        </h4>

        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            @click="metodoSeleccionado = 'Tarjeta'"
            class="flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all"
            :class="[
              metodoSeleccionado === 'Tarjeta'
                ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            ]"
          >
            <span>💳 Tarjeta (Stripe)</span>
          </button>

          <button
            type="button"
            @click="metodoSeleccionado = 'Transferencia'"
            class="flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all"
            :class="[
              metodoSeleccionado === 'Transferencia'
                ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            ]"
          >
            <span>🏦 Transferencia Bancaria</span>
          </button>
        </div>
      </div>

      <!-- Pestaña 1: Tarjeta con Stripe -->
      <div v-if="metodoSeleccionado === 'Tarjeta'">
        <StripePaymentForm
          :amount="totalFinal"
          @success="handlePagoTarjetaExitoso"
        />
      </div>

      <!-- Pestaña 2: Transferencia Bancaria -->
      <div v-else class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-1.5">
          <p class="font-bold text-slate-800">Datos para la Transferencia Bancaria:</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
            <p><strong>Banco:</strong> Banco Pichincha (Cta. Corriente)</p>
            <p><strong>Número:</strong> 2100456789</p>
            <p><strong>Beneficiario:</strong> Boletería Cooperativas Ecuador</p>
            <p><strong>RUC:</strong> 1792345678001</p>
          </div>
          <p class="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
            ⚠️ El boleto quedará en estado <strong>EN VALIDACIÓN</strong> hasta que el oficinista confirme la recepción del depósito.
          </p>
        </div>

        <div class="space-y-3">
          <InputBase
            label="Número de Referencia / Comprobante *"
            placeholder="Ej: 987654321"
            v-model="numeroComprobante"
          />

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Subir Comprobante (Opcional en demo)
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              @change="handleArchivoChange"
              class="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-xl p-1"
            />
            <p v-if="nombreArchivo" class="text-xs text-emerald-600 mt-1">
              ✓ Archivo seleccionado: {{ nombreArchivo }}
            </p>
          </div>

          <div v-if="errorTransferencia" class="text-xs font-semibold text-rose-600">
            {{ errorTransferencia }}
          </div>

          <ButtonBase
            variant="primary"
            class="w-full justify-center py-2.5 font-bold"
            :loading="procesandoTransferencia"
            @click="handleConfirmarTransferencia"
          >
            Registrar Transferencia (${{ totalFinal.toFixed(2) }})
          </ButtonBase>
        </div>
      </div>
    </div>
  </ModalBase>
</template>
