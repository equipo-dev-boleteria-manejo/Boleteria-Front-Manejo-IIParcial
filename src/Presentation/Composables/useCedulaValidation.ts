/**
 * useCedulaValidation.ts - Composable de Presentación para Validación de Cédula Ecuatoriana
 *
 * Arquitectura:
 * - Lógica Headless (100% desacoplada de la UI visual).
 * - Feedback progresivo mientras el usuario digita (conteo de dígitos, provincia, módulo 10).
 * - Chequeo asíncrono opcional de unicidad contra el backend o repositorio para detectar
 *   duplicados antes de enviar el formulario.
 */

import { ref, computed } from 'vue';
import { Cedula } from '../../Domain/ValueObjects/Cedula';

export type VerificadorCedulaFn = (cedula: string) => Promise<boolean>;

export function useCedulaValidation(checkExisteCedula?: VerificadorCedulaFn) {
  const cedula = ref('');
  const errorCedula = ref('');
  const helperCedula = ref('');
  const checkingCedula = ref(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const isCedulaValid = computed(() => {
    return Cedula.validar(cedula.value.trim());
  });

  const validateCedulaOnInput = (): boolean => {
    // Limpiamos espacios
    const limpia = cedula.value.trim();

    if (!limpia) {
      errorCedula.value = '';
      helperCedula.value = '';
      return false;
    }

    // Permitir solo números
    if (!/^\d*$/.test(limpia)) {
      errorCedula.value = 'La cédula solo debe contener números';
      helperCedula.value = '';
      return false;
    }

    const len = limpia.length;

    // Validación progresiva de longitud
    if (len < 10) {
      errorCedula.value = `Faltan dígitos: llevas ${len} de 10 dígitos`;
      helperCedula.value = '';
      return false;
    }

    if (len > 10) {
      errorCedula.value = `Excediste los 10 dígitos (tienes ${len})`;
      helperCedula.value = '';
      return false;
    }

    // Tiene exactamente 10 dígitos -> validamos provincia y módulo 10
    const prov = parseInt(limpia.substring(0, 2), 10);
    if (!((prov >= 1 && prov <= 24) || prov === 30)) {
      errorCedula.value = `Código de provincia '${limpia.substring(0, 2)}' no existe en Ecuador (01-24 o 30)`;
      helperCedula.value = '';
      return false;
    }

    const tercerDigito = parseInt(limpia.charAt(2), 10);
    if (tercerDigito >= 6) {
      errorCedula.value = `Tercer dígito (${tercerDigito}) no corresponde a cédula de persona natural (debe ser menor a 6)`;
      helperCedula.value = '';
      return false;
    }

    if (!Cedula.validar(limpia)) {
      errorCedula.value = 'Cédula no válida según el algoritmo oficial Módulo 10 del Registro Civil';
      helperCedula.value = '';
      return false;
    }

    // Es matemáticamente válida
    errorCedula.value = '';
    helperCedula.value = '✓ Cédula ecuatoriana válida';

    // Si se proveyó función para verificar existencia previa (duplicado)
    if (checkExisteCedula) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        checkingCedula.value = true;
        try {
          const yaExiste = await checkExisteCedula(limpia);
          if (yaExiste) {
            errorCedula.value = `La cédula '${limpia}' ya se encuentra registrada en el sistema`;
            helperCedula.value = '';
          }
        } catch {
          // Ignoramos errores de red en la verificación en vivo
        } finally {
          checkingCedula.value = false;
        }
      }, 350);
    }

    return true;
  };

  const validateCedula = async (): Promise<boolean> => {
    const limpia = cedula.value.trim();
    if (!limpia) {
      errorCedula.value = 'Debes ingresar tu número de cédula (10 dígitos)';
      helperCedula.value = '';
      return false;
    }

    if (limpia.length < 10) {
      errorCedula.value = 'La cédula no es válida según el estándar ecuatoriano (debe tener 10 dígitos)';
      helperCedula.value = '';
      return false;
    }

    if (!/^\d{10}$/.test(limpia)) {
      errorCedula.value = 'La cédula solo debe contener números';
      helperCedula.value = '';
      return false;
    }

    const prov = parseInt(limpia.substring(0, 2), 10);
    if (!((prov >= 1 && prov <= 24) || prov === 30)) {
      errorCedula.value = 'La cédula no es válida según el estándar ecuatoriano (provincia inexistente)';
      helperCedula.value = '';
      return false;
    }

    if (!Cedula.validar(limpia)) {
      errorCedula.value = 'La cédula no es válida según el estándar ecuatoriano (Módulo 10)';
      helperCedula.value = '';
      return false;
    }

    if (checkExisteCedula) {
      checkingCedula.value = true;
      try {
        const yaExiste = await checkExisteCedula(limpia);
        if (yaExiste) {
          errorCedula.value = `La cédula '${limpia}' ya se encuentra registrada en el sistema`;
          helperCedula.value = '';
          return false;
        }
      } catch {
        // En caso de fallo de red en blur, dejamos pasar para que la capa use case maneje
      } finally {
        checkingCedula.value = false;
      }
    }

    errorCedula.value = '';
    helperCedula.value = '✓ Cédula ecuatoriana válida';
    return true;
  };

  const resetCedula = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer);
    cedula.value = '';
    errorCedula.value = '';
    helperCedula.value = '';
    checkingCedula.value = false;
  };

  return {
    cedula,
    errorCedula,
    helperCedula,
    checkingCedula,
    isCedulaValid,
    validateCedulaOnInput,
    validateCedula,
    resetCedula,
  };
}
