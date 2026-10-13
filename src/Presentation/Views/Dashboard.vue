<template>
  <div class="space-y-6">
    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div class="flex items-start justify-between">
        <div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
            Proyecto Base Inicial - II Parcial
          </span>
          <h1 class="text-2xl font-black text-slate-900">Sistema de Venta de Pasajes Interprovinciales</h1>
          <p class="text-sm text-slate-500 mt-1">
            Plataforma centralizada para cooperativas de transporte en Ecuador. Arquitectura Limpia (Hexagonal) y flujo GitFlow.
          </p>
        </div>
      </div>
    </div>

    <!-- Módulos del Sistema -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div class="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
          🏢
        </div>
        <h3 class="font-bold text-slate-900">Cooperativas y Frecuencias</h3>
        <p class="text-xs text-slate-500">
          Gestión de cooperativas, RUC, asignación de buses y configuración de frecuencias aprobadas (origen, destino, hora).
        </p>
        <span class="inline-block text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
          Sprint 1 • Por Integrar
        </span>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div class="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg">
          🎟️
        </div>
        <h3 class="font-bold text-slate-900">Reserva y Selección de Asientos</h3>
        <p class="text-xs text-slate-500">
          Venta con 1 mes de anticipación, selección gráfica de asientos clásicos/VIP y cálculo de tarifas con descuentos por ley.
        </p>
        <span class="inline-block text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">
          Sprint 2 • Por Integrar
        </span>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div class="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg">
          💳
        </div>
        <h3 class="font-bold text-slate-900">Validación de Comprobantes</h3>
        <p class="text-xs text-slate-500">
          Recepción de comprobantes de depósito y transferencia. Módulo de oficinista para aprobación y emisión de boletos digitales.
        </p>
        <span class="inline-block text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">
          Sprint 2 • Por Integrar
        </span>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg">
          📱
        </div>
        <h3 class="font-bold text-slate-900">Chofer y Hoja de Ruta</h3>
        <p class="text-xs text-slate-500">
          Lectura de código QR para validación de abordaje de pasajeros, venta en paradas intermedias y control de tiempo de viaje.
        </p>
        <span class="inline-block text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
          Mitad de Parcial • Cambio Programado
        </span>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div class="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-lg">
          📊
        </div>
        <h3 class="font-bold text-slate-900">Auditoría y Reportes</h3>
        <p class="text-xs text-slate-500">
          Dashboard gerencial con indicadores clave para responder a preguntas comunes de auditoría informática y financiera.
        </p>
        <span class="inline-block text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded">
          Sprint 3 • Por Integrar
        </span>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div class="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
          🛡️
        </div>
        <h3 class="font-bold text-slate-900">Control de Cambios (CCB)</h3>
        <p class="text-xs text-slate-500">
          Proceso formal de gestión de configuración mediante GitHub Issues, Pull Requests y aprobación del comité.
        </p>
        <span class="inline-block text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
          Activo • GitFlow
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Dashboard inicial de bienvenida y estado del proyecto
</script>
