import { describe, expect, it } from 'vitest';
import { useBusFormValidation } from './useBusFormValidation';

describe('useBusFormValidation Composable', () => {
  it('debe inicializar valores por defecto', () => {
    const { numero, totalAsientos, estructura, errorNumero, errorAsientos } =
      useBusFormValidation();

    expect(numero.value).toBe('');
    expect(totalAsientos.value).toBe(40);
    expect(estructura.value).toBe('UnPiso');
    expect(errorNumero.value).toBe('');
    expect(errorAsientos.value).toBe('');
  });

  it('debe sanitizar número de bus permitiendo solo dígitos positivos', () => {
    const { onNumeroInput, numero, errorNumero } = useBusFormValidation();

    onNumeroInput('abc-25#');
    expect(numero.value).toBe('25');
    expect(errorNumero.value).toBe('');

    onNumeroInput('0');
    expect(errorNumero.value).toContain('mayor a 0');
  });

  it('debe validar capacidad de asientos bloqueando negativos, decimales o excedentes', () => {
    const { onTotalAsientosInput, errorAsientos } = useBusFormValidation();

    onTotalAsientosInput('-5');
    expect(errorAsientos.value).toContain('mayor a 0');

    onTotalAsientosInput('100');
    expect(errorAsientos.value).toContain('máxima permitida es de 90');

    onTotalAsientosInput('45');
    expect(errorAsientos.value).toBe('');
  });

  it('debe formatear y validar la placa correctamente', () => {
    const { onPlacaInput, placa, isPlacaValid, provinciaPlaca } = useBusFormValidation();

    onPlacaInput('-pba-1234');
    expect(placa.value).toBe('PBA-1234');
    expect(isPlacaValid.value).toBe(true);
    expect(provinciaPlaca.value).toBe('Pichincha');
  });

  it('validateAll debe validar todos los campos en conjunto', () => {
    const { onNumeroInput, onPlacaInput, onTotalAsientosInput, validateAll } =
      useBusFormValidation();

    onNumeroInput('');
    onPlacaInput('PBA-12');
    onTotalAsientosInput('-1');

    expect(validateAll()).toBe(false);

    onNumeroInput('25');
    onPlacaInput('PBA-1234');
    onTotalAsientosInput('40');

    expect(validateAll()).toBe(true);
  });

  it('initForm debe cargar datos existentes (modo edición)', () => {
    const { initForm, numero, placa, totalAsientos, estructura, isFormValid } =
      useBusFormValidation();

    initForm({
      numero: '30',
      placa: 'pns-789',
      totalAsientos: 50,
      estructura: 'DosPisos',
    });

    expect(numero.value).toBe('30');
    expect(placa.value).toBe('PNS-789');
    expect(totalAsientos.value).toBe(50);
    expect(estructura.value).toBe('DosPisos');
    expect(isFormValid.value).toBe(true);
  });
});
