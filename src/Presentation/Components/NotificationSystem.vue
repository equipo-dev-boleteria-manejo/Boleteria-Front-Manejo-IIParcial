<script setup lang="ts">
import { useUiStore } from '../Store/uiStore';
import { storeToRefs } from 'pinia';

const uiStore = useUiStore();
const { isAlertOpen, isConfirmOpen, modalConfig, toasts } = storeToRefs(uiStore);

const typeIcon = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

const typeClass = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-rose-50 text-rose-700 border-rose-200',
};

const toastBorderClass = {
  info: 'border-blue-500 bg-white text-slate-800 shadow-blue-100/50',
  success: 'border-emerald-500 bg-white text-slate-800 shadow-emerald-100/50',
  warning: 'border-amber-500 bg-white text-slate-800 shadow-amber-100/50',
  error: 'border-rose-500 bg-white text-slate-800 shadow-rose-100/50',
};

const btnClass = {
  info: 'bg-blue-600 hover:bg-blue-700',
  success: 'bg-emerald-600 hover:bg-emerald-700',
  warning: 'bg-amber-600 hover:bg-amber-700',
  error: 'bg-rose-600 hover:bg-rose-700',
};
</script>

<template>
  <!-- TOASTS EMERGENTES (Arriba a la Derecha - Max 3s) -->
  <div
    class="fixed top-5 right-5 z-[150] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    aria-live="polite"
  >
    <TransitionGroup
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-[-10px] opacity-0 sm:translate-y-0 sm:translate-x-4"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border-l-4 shadow-xl border bg-white/95 backdrop-blur-md"
        :class="toastBorderClass[toast.type]"
        role="status"
      >
        <span class="text-xl shrink-0 select-none">{{ typeIcon[toast.type] }}</span>
        <div class="flex-1 pr-1">
          <p class="text-xs font-bold leading-relaxed text-slate-800">
            {{ toast.message }}
          </p>
        </div>
        <button
          type="button"
          @click="uiStore.removeToast(toast.id)"
          class="text-slate-400 hover:text-slate-700 text-xs font-bold p-1 rounded-lg transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>
    </TransitionGroup>
  </div>

  <!-- Alert Modal -->
  <div v-if="isAlertOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
    <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
      <div class="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-4 text-white flex items-center justify-between">
        <h3 class="text-sm font-black tracking-wide uppercase">{{ modalConfig.title }}</h3>
        <span class="text-xl">{{ typeIcon[modalConfig.type] }}</span>
      </div>
      <div class="p-6 text-center space-y-4">
        <p class="text-slate-600 font-semibold text-sm leading-relaxed">{{ modalConfig.message }}</p>
        <button @click="uiStore.closeAlert" class="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-md transition-all active:scale-95 cursor-pointer" :class="btnClass[modalConfig.type]">
          {{ modalConfig.confirmText }}
        </button>
      </div>
    </div>
  </div>

  <!-- Confirm Modal (Modal Elegante y Distintivo) -->
  <div v-if="isConfirmOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
    <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
      <div class="bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 p-4 text-white flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-lg">⚠️</span>
          <h3 class="text-sm font-black tracking-wide uppercase">{{ modalConfig.title || 'Confirmación de Seguridad' }}</h3>
        </div>
      </div>
      <div class="p-6 text-center space-y-4">
        <div class="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-3xl mx-auto shadow-inner text-rose-600">
          🛑
        </div>
        <div>
          <p class="text-slate-700 font-bold text-sm leading-relaxed">{{ modalConfig.message }}</p>
          <p class="text-[11px] text-slate-400 mt-1 font-medium">Esta acción actualizará el estado del registro en la base de datos.</p>
        </div>
        <div class="grid grid-cols-2 gap-3 pt-2">
          <button @click="modalConfig.onCancel" class="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95 cursor-pointer">
            {{ modalConfig.cancelText }}
          </button>
          <button @click="modalConfig.onConfirm" class="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-all active:scale-95 cursor-pointer">
            {{ modalConfig.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-in {
  animation: fade-in 0.2s ease-out;
}
</style>
