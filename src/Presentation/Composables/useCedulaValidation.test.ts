import { describe, it, expect, vi } from 'vitest';
import { useCedulaValidation } from './useCedulaValidation';

describe('useCedulaValidation Composable', () => {
  it('debe inicializarse vacío y sin errores', () => {
    const { cedula, errorCedula, isCedulaValid } = useCedulaValidation();
    expect(cedula.value).toBe('');
    expect(errorCedula.value).toBe('');
    expect(isCedulaValid.value).toBe(false);
  });

  it('debe indicar progresivamente mientras el usuario digita (menos de 10 dígitos)', () => {
    const { cedula, errorCedula, validateCedulaOnInput } = useCedulaValidation();

    cedula.value = '17100';
    expect(validateCedulaOnInput()).toBe(false);
    expect(errorCedula.value).toContain('llevas 5 de 10 dígitos');
  });

  it('debe validar cédulas ecuatorianas válidas (Módulo 10 y provincia correcta)', async () => {
    const { cedula, errorCedula, isCedulaValid, validateCedula, helperCedula } = useCedulaValidation();

    cedula.value = '1710034065'; // Pichincha válida
    const esValida = await validateCedula();
    expect(esValida).toBe(true);
    expect(errorCedula.value).toBe('');
    expect(helperCedula.value).toContain('Cédula ecuatoriana válida');
    expect(isCedulaValid.value).toBe(true);
  });

  it('debe rechazar provincia inválida (> 24 y != 30)', async () => {
    const { cedula, errorCedula, validateCedula } = useCedulaValidation();

    cedula.value = '9910034065';
    const esValida = await validateCedula();
    expect(esValida).toBe(false);
    expect(errorCedula.value).toContain('no es válida según el estándar ecuatoriano');
  });

  it('debe detectar duplicados si se provee la función verificadora', async () => {
    const checkMock = vi.fn().mockResolvedValue(true);
    const { cedula, errorCedula, validateCedula } = useCedulaValidation(checkMock);

    cedula.value = '1710034065';
    const esValida = await validateCedula();
    expect(esValida).toBe(false);
    expect(errorCedula.value).toContain('ya se encuentra registrada');
  });
});
