<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h4 class="text-sm font-bold text-slate-900">Datos de los pasajeros</h4>
        <p class="text-xs text-slate-500">
          Cada asiento debe tener un pasajero distinto. No se permite repetir la cédula.
        </p>
      </div>
      <span class="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
        {{ pasajeros.length }} {{ pasajeros.length === 1 ? 'pasajero' : 'pasajeros' }}
      </span>
    </div>

    <article
      v-for="pasajero in pasajeros"
      :key="pasajero.asientoId"
      class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <header class="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div class="flex items-center gap-2.5">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-xs font-black text-white">
            {{ pasajero.asientoNumero }}
          </span>
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Asiento</p>
            <p class="text-sm font-bold text-slate-900">{{ pasajero.asientoNumero }}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-right">
          <span
            v-if="pasajero.descuentoAplicado > 0"
            class="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"
          >
            {{ Math.round(pasajero.descuentoAplicado * 100) }}% descuento
          </span>
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
            {{ pasajero.tipoPasajero }}
          </span>
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tarifa</p>
            <p class="text-sm font-black text-slate-900">${{ formatearPrecio(pasajero.precioFinal) }}</p>
          </div>
        </div>
      </header>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InputBase
          :model-value="pasajero.nombres"
          label="Nombres"
          placeholder="Nombres completos"
          required
          autocomplete="given-name"
          @update:model-value="actualizar(pasajero.asientoId, { nombres: $event })"
        />
        <InputBase
          :model-value="pasajero.apellidos"
          label="Apellidos"
          placeholder="Apellidos completos"
          required
          autocomplete="family-name"
          @update:model-value="actualizar(pasajero.asientoId, { apellidos: $event })"
        />
        <InputBase
          :model-value="pasajero.cedula"
          label="Cédula"
          placeholder="10 dígitos"
          required
          :maxlength="10"
          inputmode="numeric"
          autocomplete="off"
          @update:model-value="actualizarCedula(pasajero.asientoId, $event)"
        />
        <InputBase
          :model-value="pasajero.fechaNacimiento"
          label="Fecha de nacimiento"
          type="date"
          required
          :max="fechaMaxima"
          @update:model-value="actualizar(pasajero.asientoId, { fechaNacimiento: $event })"
        />

        <label class="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 sm:col-span-2">
          <input
            type="checkbox"
            class="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            :checked="pasajero.tieneDiscapacidad"
            @change="actualizar(pasajero.asientoId, { tieneDiscapacidad: ($event.target as HTMLInputElement).checked })"
          />
          <span>
            <span class="block text-xs font-bold text-slate-700">Persona con discapacidad</span>
            <span class="mt-0.5 block text-[11px] text-slate-500">
              Aplica el 50 % de descuento según la tarifa oficial.
            </span>
          </span>
        </label>
      </div>

      <div
        v-if="pasajero.error"
        class="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"
      >
        <span>⚠️</span>
        <span>{{ pasajero.error }}</span>
      </div>

      <div
        v-else-if="pasajero.valido && pasajero.descuentoAplicado > 0"
        class="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
      >
        Descuento aplicado: ${{ formatearPrecio(pasajero.precioBase - pasajero.precioFinal) }}
        (tarifa base ${{ formatearPrecio(pasajero.precioBase) }}).
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import InputBase from './InputBase.vue'
import type {
  DatosPasajeroSeleccion,
  PasajeroCalculado,
} from '../Composables/useSeleccionCompra'

interface Props {
  pasajeros: PasajeroCalculado[]
}

defineProps<Props>()

const emit = defineEmits<{
  (
    e: 'actualizar',
    asientoId: number,
    cambios: Partial<DatosPasajeroSeleccion>,
  ): void
}>()

const fechaMaxima = new Date().toISOString().slice(0, 10)

function actualizar(
  asientoId: number,
  cambios: Partial<DatosPasajeroSeleccion>,
): void {
  emit('actualizar', asientoId, cambios)
}

function actualizarCedula(asientoId: number, valor: string): void {
  actualizar(asientoId, { cedula: valor.replace(/\D/g, '').slice(0, 10) })
}

function formatearPrecio(valor: number): string {
  return Number(valor ?? 0).toFixed(2)
}
</script>
