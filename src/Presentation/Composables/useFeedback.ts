/**
 * useFeedback.ts - Composable de Presentación Unificado para Notificaciones y Confirmaciones
 *
 * Arquitectura:
 * - Centraliza y desacopla la comunicación con el usuario (toasts no intrusivos y diálogos de confirmación).
 * - Garantiza consistencia visual y de comportamiento en toda la aplicación (duración estándar de 3s,
 *   posicionamiento unificado en la esquina superior derecha, paleta de colores coherente).
 * - Facilita el manejo de promesas/operaciones asíncronas con feedback automático.
 */

import { useUiStore } from '../Store/uiStore';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'info' | 'error' | 'success';
}

export function useFeedback() {
  const uiStore = useUiStore();

  const showSuccess = (message: string, duration = 3000) => {
    uiStore.showToast(message, 'success', duration);
  };

  const showError = (message: string, duration = 4000) => {
    uiStore.showToast(message, 'error', duration);
  };

  const showWarning = (message: string, duration = 3500) => {
    uiStore.showToast(message, 'warning', duration);
  };

  const showInfo = (message: string, duration = 3000) => {
    uiStore.showToast(message, 'info', duration);
  };

  const confirm = async (options: ConfirmOptions): Promise<boolean> => {
    return uiStore.showConfirm({
      title: options.title,
      message: options.message,
      confirmText: options.confirmText ?? 'Confirmar',
      cancelText: options.cancelText ?? 'Cancelar',
      type: options.type ?? 'warning',
    });
  };

  /**
   * Ejecuta una acción asíncrona manejando automáticamente los toasts de éxito y error.
   */
  const executeWithFeedback = async <T>(
    action: () => Promise<T>,
    options: {
      successMessage?: string | ((result: T) => string);
      errorMessage?: string | ((err: unknown) => string);
    } = {}
  ): Promise<T | null> => {
    try {
      const result = await action();
      if (options.successMessage) {
        const msg =
          typeof options.successMessage === 'function'
            ? options.successMessage(result)
            : options.successMessage;
        showSuccess(msg);
      }
      return result;
    } catch (err: unknown) {
      if (options.errorMessage) {
        const msg =
          typeof options.errorMessage === 'function'
            ? options.errorMessage(err)
            : options.errorMessage;
        showError(msg);
      } else if (err instanceof Error) {
        showError(err.message);
      } else {
        showError('Ocurrió un error inesperado al procesar la solicitud.');
      }
      return null;
    }
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    confirm,
    executeWithFeedback,
  };
}
