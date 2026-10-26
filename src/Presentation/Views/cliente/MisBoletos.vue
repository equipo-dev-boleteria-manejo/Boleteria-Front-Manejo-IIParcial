<template>
  <CardBase title="Mis Boletos y Pasajes" subtitle="Historial de compras y descargas de comprobantes" hover>
    <div class="py-12 text-center text-slate-400 space-y-2">
      <span class="text-5xl block mb-2">🎫</span>
      <h3 class="font-bold text-slate-700 text-lg">Historial de Boletos</h3>
      <p class="text-xs text-slate-500 max-w-md mx-auto">
        Estructura base lista para consumir <code class="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-mono">useTickets</code> y descarga de códigos QR.
      </p>
      <span class="inline-block mt-2 text-[10px] font-bold bg-pink-50 text-pink-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
        Responsable: Monse
      </span>
    </div>
  </CardBase>
</template>

<script setup lang="ts">
import CardBase from '../../Components/CardBase.vue'
</script>
