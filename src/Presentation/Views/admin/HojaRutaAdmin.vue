<template>
  <CardBase title="Hojas de Ruta y Despacho" subtitle="Control de viajes diarios y asignaciones operativas" hover>
    <div class="py-12 text-center text-slate-400 space-y-2">
      <span class="text-5xl block mb-2">📋</span>
      <h3 class="font-bold text-slate-700 text-lg">Módulo de Hojas de Ruta</h3>
      <p class="text-xs text-slate-500 max-w-md mx-auto">
        Estructura base lista para consumir <code class="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-mono">useHojaRuta</code> y componente de lista de viajes.
      </p>
      <span class="inline-block mt-2 text-[10px] font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
        Responsable: Diego Chiquito
      </span>
    </div>
  </CardBase>
</template>

<script setup lang="ts">
import CardBase from '../../Components/CardBase.vue'
</script>
