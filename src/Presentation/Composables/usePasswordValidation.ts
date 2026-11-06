/**
 * usePasswordValidation.ts - Composable de Presentación para Validación de Contraseñas
 *
 * Arquitectura:
 * - Lógica Headless (100% desacoplada de la UI visual).
 * - Centraliza las políticas de seguridad de contraseñas:
 *   - Longitud mínima (8 caracteres).
 *   - Al menos una letra mayúscula.
 *   - Al menos una letra minúscula.
 *   - Al menos un dígito numérico.
 *   - Confirmación de contraseña (coincidencia exacta).
 * - Provee medidor reactivo de requisitos y funciones de validación.
 */

import { ref, computed } from 'vue';

export const LONGITUD_MINIMA_PASSWORD = 8;

export interface PasswordRequirement {
  label: string;
  isValid: boolean;
}

export function usePasswordValidation() {
  const password = ref('');
  const confirmPassword = ref('');
  const showPassword = ref(false);
  const showConfirmPassword = ref(false);

  const errorPassword = ref('');
  const errorConfirmPassword = ref('');

  const passwordRequirements = computed<PasswordRequirement[]>(() => [
    {
      label: `Mínimo ${LONGITUD_MINIMA_PASSWORD} caracteres`,
      isValid: password.value.length >= LONGITUD_MINIMA_PASSWORD,
    },
    {
      label: 'Una letra mayúscula',
      isValid: /[A-Z]/.test(password.value),
    },
    {
      label: 'Una letra minúscula',
      isValid: /[a-z]/.test(password.value),
    },
    {
      label: 'Al menos un número',
      isValid: /[0-9]/.test(password.value),
    },
  ]);

  const completedRequirements = computed(() =>
    passwordRequirements.value.filter((req) => req.isValid).length
  );

  const isPasswordValid = computed(() =>
    completedRequirements.value === passwordRequirements.value.length
  );

  const passwordsMatch = computed(() =>
    password.value.length > 0 && password.value === confirmPassword.value
  );

  const validatePassword = (): boolean => {
    if (!password.value) {
      errorPassword.value = 'Debes ingresar una contraseña';
      return false;
    }
    if (password.value.length < LONGITUD_MINIMA_PASSWORD) {
      errorPassword.value = `La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres`;
      return false;
    }
    if (!isPasswordValid.value) {
      errorPassword.value = 'La contraseña no cumple con los requisitos de seguridad';
      return false;
    }
    errorPassword.value = '';
    return true;
  };

  const validateConfirmPassword = (): boolean => {
    if (!confirmPassword.value) {
      errorConfirmPassword.value = 'Debes confirmar la contraseña';
      return false;
    }
    if (password.value !== confirmPassword.value) {
      errorConfirmPassword.value = 'Las contraseñas no coinciden';
      return false;
    }
    errorConfirmPassword.value = '';
    return true;
  };

  const validateAll = (): boolean => {
    const passOk = validatePassword();
    const confirmOk = validateConfirmPassword();
    return passOk && confirmOk;
  };

  const resetPasswordFields = (): void => {
    password.value = '';
    confirmPassword.value = '';
    showPassword.value = false;
    showConfirmPassword.value = false;
    errorPassword.value = '';
    errorConfirmPassword.value = '';
  };

  return {
    password,
    confirmPassword,
    showPassword,
    showConfirmPassword,
    errorPassword,
    errorConfirmPassword,
    passwordRequirements,
    completedRequirements,
    isPasswordValid,
    passwordsMatch,
    validatePassword,
    validateConfirmPassword,
    validateAll,
    resetPasswordFields,
  };
}
