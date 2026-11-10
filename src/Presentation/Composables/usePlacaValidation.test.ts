import { describe, expect, it, vi, beforeEach } from 'vitest';
import { usePlacaValidation } from './usePlacaValidation';

describe('usePlacaValidation Composable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('debe iniciar con estado vacío', () => {
    const { placa, errorPlaca, helperPlaca, isPlacaValid } = usePlacaValidation();

    expect(placa.value).toBe('');
    expect(errorPlaca.value).toBe('');
    expect(helperPlaca.value).toBe('');
    expect(isPlacaValid.value).toBe(false);
  });

  it('debe sanitizar guiones al inicio y forzar mayúsculas', () => {
    const { formatPlacaOnInput, placa } = usePlacaValidation();

    formatPlacaOnInput('-pba-254');
    expect(placa.value).toBe('PBA-254');
  });

  it('debe auto-insertar el guion cuando se escriben números tras las 3 letras', () => {
    const { formatPlacaOnInput, placa } = usePlacaValidation();

    formatPlacaOnInput('pba1234');
    expect(placa.value).toBe('PBA-1234');
  });

  it('debe detectar provincia y marcar como válida una placa Pichincha (P)', () => {
    const { formatPlacaOnInput, isPlacaValid, provinciaPlaca, errorPlaca, helperPlaca } =
      usePlacaValidation();

    formatPlacaOnInput('PBA-1234');

    expect(isPlacaValid.value).toBe(true);
    expect(provinciaPlaca.value).toBe('Pichincha');
    expect(errorPlaca.value).toBe('');
    expect(helperPlaca.value).toContain('Pichincha');
  });

  it('debe advertir si la primera letra no pertenece a una provincia ecuatoriana', () => {
    const { formatPlacaOnInput, isPlacaValid, errorPlaca } = usePlacaValidation();

    formatPlacaOnInput('DBA-1234');

    expect(isPlacaValid.value).toBe(false);
    expect(errorPlaca.value).toContain('no corresponde a una provincia');
  });

  it('debe validar asíncronamente placa duplicada', async () => {
    const mockCheckExiste = vi.fn().mockResolvedValue(true);
    const { formatPlacaOnInput, errorPlaca } = usePlacaValidation(mockCheckExiste);

    formatPlacaOnInput('PBA-1234');
    vi.advanceTimersByTime(500);
    await Promise.resolve();

    expect(mockCheckExiste).toHaveBeenCalledWith('PBA-1234');
    expect(errorPlaca.value).toContain('ya se encuentra registrada');
  });

  it('debe reiniciar el estado con resetPlacaValidation', () => {
    const { formatPlacaOnInput, resetPlacaValidation, placa, errorPlaca } = usePlacaValidation();

    formatPlacaOnInput('PBA-1234');
    resetPlacaValidation();

    expect(placa.value).toBe('');
    expect(errorPlaca.value).toBe('');
  });
});
