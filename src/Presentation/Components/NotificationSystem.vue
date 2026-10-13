<script setup lang="ts">
import { useUiStore } from '../Store/uiStore';
import { storeToRefs } from 'pinia';

const uiStore = useUiStore();
const { isAlertOpen, isConfirmOpen, modalConfig } = storeToRefs(uiStore);

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
  error: 'bg-red-50 text-red-700 border-red-200',
};

const btnClass = {
  info: 'bg-blue-600 hover:bg-blue-700',
  success: 'bg-emerald-600 hover:bg-emerald-700',
  warning: 'bg-amber-600 hover:bg-amber-700',
  error: 'bg-red-600 hover:bg-red-700',
};
</script>

<template>
  <!-- Alert Modal -->
  <div v-if="isAlertOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
    <div class="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100">
      <div class="p-8 text-center space-y-4">
        <div class="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-inner" :class="typeClass[modalConfig.type]">
          {{ typeIcon[modalConfig.type] }}
        </div>
        <div>
          <h3 class="text-xl font-black text-slate-900">{{ modalConfig.title }}</h3>
          <p class="mt-2 text-slate-500 font-medium leading-relaxed">{{ modalConfig.message }}</p>
        </div>
        <button @click="uiStore.closeAlert" class="w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95" :class="btnClass[modalConfig.type]">
          {{ modalConfig.confirmText }}
        </button>
      </div>
    </div>
  </div>

  <!-- Confirm Modal -->
  <div v-if="isConfirmOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
    <div class="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100">
      <div class="p-8 text-center space-y-4">
        <div class="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center text-4xl mx-auto shadow-inner">
          ❓
        </div>
        <div>
          <h3 class="text-xl font-black text-slate-900">{{ modalConfig.title }}</h3>
          <p class="mt-2 text-slate-500 font-medium leading-relaxed">{{ modalConfig.message }}</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button @click="modalConfig.onCancel" class="w-full py-4 rounded-2xl font-black text-slate-400 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95">
            {{ modalConfig.cancelText }}
          </button>
          <button @click="modalConfig.onConfirm" class="w-full py-4 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95">
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
