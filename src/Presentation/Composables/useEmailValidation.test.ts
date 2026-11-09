import { describe, it, expect, vi } from 'vitest';
import { useEmailValidation } from './useEmailValidation';

describe('useEmailValidation Composable', () => {
  it('debe validar correos con formato correcto', async () => {
    const { email, errorEmail, isEmailValid, validateEmail } = useEmailValidation();

    email.value = 'usuario@transporte.ec';
    const esValido = await validateEmail();
    expect(esValido).toBe(true);
    expect(errorEmail.value).toBe('');
    expect(isEmailValid.value).toBe(true);
  });

  it('debe guiar progresivamente onInput si falta arroba o dominio', () => {
    const { email, errorEmail, validateEmailOnInput } = useEmailValidation();

    email.value = 'correo-invalido';
    expect(validateEmailOnInput()).toBe(false);
    expect(errorEmail.value).toContain("Falta el símbolo '@'");

    email.value = 'correo@';
    expect(validateEmailOnInput()).toBe(false);
    expect(errorEmail.value).toContain('Falta el dominio');

    email.value = 'correo@gmail';
    expect(validateEmailOnInput()).toBe(false);
    expect(errorEmail.value).toContain('Falta la extensión del dominio');
  });

  it('debe exigir correo si está vacío', async () => {
    const { email, errorEmail, validateEmail } = useEmailValidation();

    email.value = '';
    const esValido = await validateEmail();
    expect(esValido).toBe(false);
    expect(errorEmail.value).toBe('Debes ingresar tu correo electrónico');
  });

  it('debe detectar correo duplicado con la función verificadora', async () => {
    const checkMock = vi.fn().mockResolvedValue(true);
    const { email, errorEmail, validateEmail } = useEmailValidation(checkMock);

    email.value = 'chofer@transporte.ec';
    const esValido = await validateEmail();
    expect(esValido).toBe(false);
    expect(errorEmail.value).toContain('ya se encuentra registrado');
  });
});
