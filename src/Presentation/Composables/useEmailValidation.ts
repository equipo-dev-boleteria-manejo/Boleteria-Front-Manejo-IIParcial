/**
 * useEmailValidation.ts - Composable de Presentación para Validación de Correo Electrónico
 *
 * Arquitectura:
 * - Lógica Headless (100% desacoplada de la UI visual).
 * - Validación y orientación progresiva mientras el usuario digita (detecta falta de '@', dominio, extensión .com/.ec, etc.).
 * - Chequeo asíncrono opcional de unicidad (duplicados).
 */

import { ref, computed } from 'vue';

export const REGEX_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export type VerificadorEmailFn = (email: string) => Promise<boolean>;

export function useEmailValidation(checkExisteEmail?: VerificadorEmailFn) {
  const email = ref('');
  const errorEmail = ref('');
  const helperEmail = ref('');
  const checkingEmail = ref(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const isEmailValid = computed(() => {
    const limpia = email.value.trim().toLowerCase();
    return limpia.length > 0 && REGEX_EMAIL.test(limpia);
  });

  const validateEmailOnInput = (): boolean => {
    const limpia = email.value.trim();

    if (!limpia) {
      errorEmail.value = '';
      helperEmail.value = '';
      return false;
    }

    // Orientación paso a paso mientras digita
    if (!limpia.includes('@')) {
      errorEmail.value = "Falta el símbolo '@' (ej. usuario@gmail.com)";
      helperEmail.value = '';
      return false;
    }

    const partes = limpia.split('@');
    if (!partes[0]) {
      errorEmail.value = 'Falta el nombre de usuario antes del @';
      helperEmail.value = '';
      return false;
    }

    const dominio = partes[1];
    if (!dominio) {
      errorEmail.value = "Falta el dominio después del '@' (ej. gmail.com o empresa.ec)";
      helperEmail.value = '';
      return false;
    }

    if (!dominio.includes('.')) {
      errorEmail.value = "Falta la extensión del dominio (ej. .com, .ec, .edu.ec)";
      helperEmail.value = '';
      return false;
    }

    const subpartes = dominio.split('.');
    const tld = subpartes[subpartes.length - 1];
    if (tld.length < 2) {
      errorEmail.value = 'La extensión del dominio debe tener al menos 2 caracteres (ej. .com)';
      helperEmail.value = '';
      return false;
    }

    if (!REGEX_EMAIL.test(limpia)) {
      errorEmail.value = 'El formato de correo electrónico es inválido';
      helperEmail.value = '';
      return false;
    }

    errorEmail.value = '';
    helperEmail.value = '✓ Correo electrónico válido';

    // Chequeo de duplicado si se pasa la función verificadora
    if (checkExisteEmail) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        checkingEmail.value = true;
        try {
          const yaExiste = await checkExisteEmail(limpia.toLowerCase());
          if (yaExiste) {
            errorEmail.value = `El correo '${limpia}' ya se encuentra registrado`;
            helperEmail.value = '';
          }
        } catch {
          // Ignorar fallos de red en vivo
        } finally {
          checkingEmail.value = false;
        }
      }, 350);
    }

    return true;
  };

  const validateEmail = async (): Promise<boolean> => {
    const limpia = email.value.trim().toLowerCase();
    if (!limpia) {
      errorEmail.value = 'Debes ingresar tu correo electrónico';
      helperEmail.value = '';
      return false;
    }

    if (!limpia.includes('@')) {
      errorEmail.value = "El correo debe incluir un '@' (ej. usuario@gmail.com)";
      helperEmail.value = '';
      return false;
    }

    if (!REGEX_EMAIL.test(limpia)) {
      errorEmail.value = 'El formato de correo electrónico es inválido';
      helperEmail.value = '';
      return false;
    }

    if (checkExisteEmail) {
      checkingEmail.value = true;
      try {
        const yaExiste = await checkExisteEmail(limpia);
        if (yaExiste) {
          errorEmail.value = `El correo '${limpia}' ya se encuentra registrado`;
          helperEmail.value = '';
          return false;
        }
      } catch {
        // Fallo de red tolerado en blur
      } finally {
        checkingEmail.value = false;
      }
    }

    errorEmail.value = '';
    helperEmail.value = '✓ Correo electrónico válido';
    return true;
  };

  const resetEmail = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer);
    email.value = '';
    errorEmail.value = '';
    helperEmail.value = '';
    checkingEmail.value = false;
  };

  return {
    email,
    errorEmail,
    helperEmail,
    checkingEmail,
    isEmailValid,
    validateEmailOnInput,
    validateEmail,
    resetEmail,
  };
}
