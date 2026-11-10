import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUiStore } from './uiStore';

describe('useUiStore - Toasts y Notificaciones Emergentes', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('debe tener el método showToast y registrar un toast reactivo', () => {
    const uiStore = useUiStore();
    expect(typeof uiStore.showToast).toBe('function');
    expect(uiStore.toasts).toHaveLength(0);

    uiStore.showToast('Usuario actualizado con éxito', 'success', 3000);

    expect(uiStore.toasts).toHaveLength(1);
    expect(uiStore.toasts[0].message).toBe('Usuario actualizado con éxito');
    expect(uiStore.toasts[0].type).toBe('success');
  });

  it('debe eliminar un toast con removeToast', () => {
    const uiStore = useUiStore();
    uiStore.showToast('Test', 'info', 0);
    const id = uiStore.toasts[0].id;

    uiStore.removeToast(id);
    expect(uiStore.toasts).toHaveLength(0);
  });
});
