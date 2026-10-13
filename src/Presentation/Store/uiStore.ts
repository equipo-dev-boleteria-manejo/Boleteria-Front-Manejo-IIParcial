import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ModalConfig {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const useUiStore = defineStore('ui', () => {
  const isAlertOpen = ref(false);
  const isConfirmOpen = ref(false);
  const modalConfig = ref<ModalConfig>({
    title: '',
    message: '',
    type: 'info',
  });

  function showAlert(config: Omit<ModalConfig, 'onConfirm' | 'onCancel' | 'confirmText' | 'cancelText'>) {
    modalConfig.value = { ...config, confirmText: 'Aceptar' };
    isAlertOpen.value = true;
  }

  function showConfirm(config: ModalConfig): Promise<boolean> {
    return new Promise((resolve) => {
      modalConfig.value = {
        ...config,
        confirmText: config.confirmText || 'Confirmar',
        cancelText: config.cancelText || 'Cancelar',
        onConfirm: () => {
          isConfirmOpen.value = false;
          if (config.onConfirm) config.onConfirm();
          resolve(true);
        },
        onCancel: () => {
          isConfirmOpen.value = false;
          if (config.onCancel) config.onCancel();
          resolve(false);
        },
      };
      isConfirmOpen.value = true;
    });
  }

  function closeAlert() {
    isAlertOpen.value = false;
  }

  return {
    isAlertOpen,
    isConfirmOpen,
    modalConfig,
    showAlert,
    showConfirm,
    closeAlert,
  };
});
