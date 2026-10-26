<template>
  <CardBase title="Control de Abordaje" subtitle="Validación y escaneo de boletos QR para choferes" hover>
    <div class="py-12 text-center text-slate-400 space-y-2">
      <span class="text-5xl block mb-2">📷</span>
      <h3 class="font-bold text-slate-700 text-lg">Módulo de Validación QR</h3>
      <p class="text-xs text-slate-500 max-w-md mx-auto">
        Estructura base lista para consumir <code class="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-mono">useChoferRuta</code> y lector QR.
      </p>
      <span class="inline-block mt-2 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
        Responsable: Diego Chiquito
      </span>
    </div>
  </CardBase>
</template>

<script setup lang="ts">
import CardBase from '../../Components/CardBase.vue'
</script>
