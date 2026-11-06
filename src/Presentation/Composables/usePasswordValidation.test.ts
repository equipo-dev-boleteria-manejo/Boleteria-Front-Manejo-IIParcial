import { describe, it, expect } from 'vitest';
import { usePasswordValidation } from './usePasswordValidation';

describe('usePasswordValidation Composable', () => {
  it('debe inicializarse con campos vacíos y requisitos en false', () => {
    const {
      password,
      confirmPassword,
      passwordRequirements,
      completedRequirements,
      isPasswordValid,
      passwordsMatch,
    } = usePasswordValidation();

    expect(password.value).toBe('');
    expect(confirmPassword.value).toBe('');
    expect(completedRequirements.value).toBe(0);
    expect(isPasswordValid.value).toBe(false);
    expect(passwordsMatch.value).toBe(false);
    expect(passwordRequirements.value).toHaveLength(4);
  });

  it('debe evaluar correctamente cada requisito de seguridad', () => {
    const { password, completedRequirements, isPasswordValid } = usePasswordValidation();

    password.value = 'abc';
    expect(completedRequirements.value).toBe(1); // minúscula

    password.value = 'abcABC';
    expect(completedRequirements.value).toBe(2); // minúscula + mayúscula

    password.value = 'abcABC1';
    expect(completedRequirements.value).toBe(3); // minúscula + mayúscula + número

    password.value = 'Abc12345';
    expect(completedRequirements.value).toBe(4); // minúscula + mayúscula + número + longitud >= 8
    expect(isPasswordValid.value).toBe(true);
  });

  it('debe validar coincidencia de confirmación de contraseña', () => {
    const {
      password,
      confirmPassword,
      passwordsMatch,
      validateConfirmPassword,
      errorConfirmPassword,
    } = usePasswordValidation();

    password.value = 'Password123';
    confirmPassword.value = 'Password456';
    expect(passwordsMatch.value).toBe(false);
    expect(validateConfirmPassword()).toBe(false);
    expect(errorConfirmPassword.value).toBe('Las contraseñas no coinciden');

    confirmPassword.value = 'Password123';
    expect(passwordsMatch.value).toBe(true);
    expect(validateConfirmPassword()).toBe(true);
    expect(errorConfirmPassword.value).toBe('');
  });

  it('debe validar todos los campos con validateAll', () => {
    const {
      password,
      confirmPassword,
      validateAll,
      errorPassword,
      errorConfirmPassword,
    } = usePasswordValidation();

    expect(validateAll()).toBe(false);
    expect(errorPassword.value).toBe('Debes ingresar una contraseña');
    expect(errorConfirmPassword.value).toBe('Debes confirmar la contraseña');

    password.value = 'Segura123';
    confirmPassword.value = 'Segura123';
    expect(validateAll()).toBe(true);
    expect(errorPassword.value).toBe('');
    expect(errorConfirmPassword.value).toBe('');
  });

  it('debe resetear los campos con resetPasswordFields', () => {
    const {
      password,
      confirmPassword,
      errorPassword,
      errorConfirmPassword,
      showPassword,
      resetPasswordFields,
    } = usePasswordValidation();

    password.value = 'Test1234';
    confirmPassword.value = 'Test1234';
    showPassword.value = true;
    errorPassword.value = 'error';
    errorConfirmPassword.value = 'error';

    resetPasswordFields();

    expect(password.value).toBe('');
    expect(confirmPassword.value).toBe('');
    expect(showPassword.value).toBe(false);
    expect(errorPassword.value).toBe('');
    expect(errorConfirmPassword.value).toBe('');
  });
});
