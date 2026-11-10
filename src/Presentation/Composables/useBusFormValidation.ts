/**
 * useBusFormValidation.ts - Composable Desacoplado para Validación de Formularios de Bus
 *
 * Arquitectura:
 * - 100% independiente de los templates .vue (Single Responsibility Principle).
 * - Reutilizable tanto en creación (Registrar Nuevo Bus) como en edición (Editar Bus).
 * - Integra usePlacaValidation para reglas oficiales ANT (provincias, mayúsculas, sanitización).
 * - Valida número de disco (entero positivo) y capacidad de asientos (entero > 0, máx 90).
 */

import { ref, computed } from 'vue';
import { usePlacaValidation } from './usePlacaValidation';

export interface BusFormData {
  numero: string;
  placa: string;
  totalAsientos: number;
  estructura: 'UnPiso' | 'DosPisos';
}

export function useBusFormValidation(initialData?: Partial<BusFormData>) {
  const numero = ref(initialData?.numero ?? '');
  const totalAsientos = ref<number | string>(initialData?.totalAsientos ?? 40);
  const estructura = ref<'UnPiso' | 'DosPisos'>(initialData?.estructura ?? 'UnPiso');

  const errorNumero = ref('');
  const errorAsientos = ref('');

  // Validación de placa delegada al composable independiente
  const {
    placa,
    errorPlaca,
    helperPlaca,
    isPlacaValid,
    provinciaPlaca,
    formatPlacaOnInput,
    resetPlacaValidation,
  } = usePlacaValidation();

  if (initialData?.placa) {
    formatPlacaOnInput(initialData.placa);
  }

  const onNumeroInput = (val: string): string => {
    const soloDigitos = (val || '').replace(/[^0-9]/g, '');
    numero.value = soloDigitos;
    validateNumero();
    return soloDigitos;
  };

  const validateNumero = (): boolean => {
    const val = String(numero.value ?? '').trim();
    if (!val) {
      errorNumero.value = 'El número de disco es obligatorio';
      return false;
    }
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      errorNumero.value = 'El número de disco debe ser mayor a 0';
      return false;
    }
    errorNumero.value = '';
    return true;
  };

  const onTotalAsientosInput = (val: string | number): number => {
    const str = String(val ?? '').trim();
    if (!str) {
      totalAsientos.value = '';
      errorAsientos.value = 'La capacidad de asientos es obligatoria';
      return 0;
    }
    const num = Number(str);
    totalAsientos.value = num;
    validateAsientos();
    return isNaN(num) ? 0 : num;
  };

  const validateAsientos = (): boolean => {
    const str = String(totalAsientos.value ?? '').trim();
    if (!str) {
      errorAsientos.value = 'La capacidad de asientos es obligatoria';
      return false;
    }
    const num = Number(str);
    if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
      errorAsientos.value = 'Debe ser un número entero mayor a 0';
      return false;
    }
    if (num > 90) {
      errorAsientos.value = 'La capacidad máxima permitida es de 90 asientos';
      return false;
    }
    errorAsientos.value = '';
    return true;
  };

  const onPlacaInput = (val: string): string => {
    return formatPlacaOnInput(val);
  };

  const validateAll = (): boolean => {
    const numOk = validateNumero();
    const placaOk = isPlacaValid.value;
    const asientosOk = validateAsientos();

    if (!placaOk && !errorPlaca.value) {
      errorPlaca.value = 'Formato de placa inválido (ej. PBA-1234)';
    }

    return numOk && placaOk && asientosOk;
  };

  const initForm = (data: Partial<BusFormData>) => {
    numero.value = data.numero ?? '';
    totalAsientos.value = data.totalAsientos ?? 40;
    estructura.value = data.estructura ?? 'UnPiso';
    errorNumero.value = '';
    errorAsientos.value = '';
    if (data.placa) {
      formatPlacaOnInput(data.placa);
    } else {
      resetPlacaValidation();
    }
  };

  const resetForm = () => {
    numero.value = '';
    totalAsientos.value = 40;
    estructura.value = 'UnPiso';
    errorNumero.value = '';
    errorAsientos.value = '';
    resetPlacaValidation();
  };

  const isFormValid = computed(() => {
    return (
      isPlacaValid.value &&
      !errorNumero.value &&
      !errorAsientos.value &&
      Boolean(String(numero.value).trim())
    );
  });

  return {
    numero,
    placa,
    totalAsientos,
    estructura,
    errorNumero,
    errorPlaca,
    errorAsientos,
    helperPlaca,
    isPlacaValid,
    provinciaPlaca,
    isFormValid,
    onNumeroInput,
    onPlacaInput,
    onTotalAsientosInput,
    validateNumero,
    validateAsientos,
    validateAll,
    initForm,
    resetForm,
  };
}
