import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useFeedback } from './useFeedback';

const mockUiStore = vi.hoisted(() => ({
  showToast: vi.fn(),
  showConfirm: vi.fn(),
}));

vi.mock('../Store/uiStore', () => ({
  useUiStore: () => mockUiStore,
}));

describe('useFeedback Composable', () => {
  beforeEach(() => {
    mockUiStore.showToast.mockReset();
    mockUiStore.showConfirm.mockReset();
  });

  it('debe disparar showToast con tipo success y duración por defecto (3000ms)', () => {
    const { showSuccess } = useFeedback();
    showSuccess('Operación exitosa');

    expect(mockUiStore.showToast).toHaveBeenCalledWith('Operación exitosa', 'success', 3000);
  });

  it('debe disparar showToast con tipo error y duración adecuada (4000ms)', () => {
    const { showError } = useFeedback();
    showError('Error de conexión');

    expect(mockUiStore.showToast).toHaveBeenCalledWith('Error de conexión', 'error', 4000);
  });

  it('debe disparar showToast con tipo warning', () => {
    const { showWarning } = useFeedback();
    showWarning('Advertencia de capacidad');

    expect(mockUiStore.showToast).toHaveBeenCalledWith('Advertencia de capacidad', 'warning', 3500);
  });

  it('debe llamar a showConfirm con los parámetros normalizados', async () => {
    mockUiStore.showConfirm.mockResolvedValue(true);
    const { confirm } = useFeedback();

    const resultado = await confirm({
      title: 'Desactivar bus',
      message: '¿Estás seguro?',
      confirmText: 'Desactivar',
    });

    expect(resultado).toBe(true);
    expect(mockUiStore.showConfirm).toHaveBeenCalledWith({
      title: 'Desactivar bus',
      message: '¿Estás seguro?',
      confirmText: 'Desactivar',
      cancelText: 'Cancelar',
      type: 'warning',
    });
  });

  it('executeWithFeedback debe ejecutar acción exitosa y mostrar toast de éxito', async () => {
    const { executeWithFeedback } = useFeedback();
    const mockAction = vi.fn().mockResolvedValue({ id: 26, numero: '26' });

    const result = await executeWithFeedback(mockAction, {
      successMessage: (bus) => `Bus ${bus.numero} registrado con éxito.`,
    });

    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 26, numero: '26' });
    expect(mockUiStore.showToast).toHaveBeenCalledWith('Bus 26 registrado con éxito.', 'success', 3000);
  });

  it('executeWithFeedback debe capturar error y mostrar toast de error', async () => {
    const { executeWithFeedback } = useFeedback();
    const mockAction = vi.fn().mockRejectedValue(new Error('Fallo de red'));

    const result = await executeWithFeedback(mockAction, {
      errorMessage: 'No se pudo completar la operación',
    });

    expect(result).toBeNull();
    expect(mockUiStore.showToast).toHaveBeenCalledWith('No se pudo completar la operación', 'error', 4000);
  });
});
