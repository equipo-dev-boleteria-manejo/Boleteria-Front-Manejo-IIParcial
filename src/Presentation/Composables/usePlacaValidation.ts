/**
 * usePlacaValidation.ts - Composable de Presentación para Validación de Placa Vehicular Ecuatoriana
 *
 * Arquitectura:
 * - Lógica Headless (100% desacoplada de la interfaz visual).
 * - Sanitización en tiempo real: mayúsculas obligatorias, bloqueo de caracteres extraños iniciales.
 * - Auto-formateo del guion ANT (AAA-1234).
 * - Identificación reactiva de la provincia.
 * - Validación asíncrona opcional de unicidad contra repositorio o backend.
 */

import { ref, computed } from 'vue';
import { Placa, PROVINCIAS_ECUADOR } from '../../Domain/ValueObjects/Placa';

export type VerificadorPlacaFn = (placa: string) => Promise<boolean>;

export function usePlacaValidation(checkExistePlaca?: VerificadorPlacaFn) {
  const placa = ref('');
  const errorPlaca = ref('');
  const helperPlaca = ref('');
  const checkingPlaca = ref(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const isPlacaValid = computed(() => {
    return Placa.validar(placa.value);
  });

  const provinciaPlaca = computed(() => {
    return Placa.obtenerProvincia(placa.value);
  });

  /**
   * Sanitiza y auto-formatea la placa mientras el usuario escribe:
   * 1. Elimina caracteres no alfanuméricos al inicio (como guiones accidentales '-').
   * 2. Fuerza mayúsculas.
   * 3. Inserta automáticamente el guion tras las primeras 3 letras si el usuario escribe dígitos.
   * 4. Limita a 3 letras y hasta 4 dígitos (máximo 8 caracteres: AAA-1234).
   */
  const formatPlacaOnInput = (rawVal: string): string => {
    if (!rawVal) {
      placa.value = '';
      errorPlaca.value = '';
      helperPlaca.value = '';
      return '';
    }

    // Convertir a mayúsculas y limpiar caracteres inválidos
    let val = rawVal.toUpperCase().replace(/[^A-Z0-9-]/g, '');

    // Eliminar guiones al inicio
    val = val.replace(/^-+/, '');

    // Separar letras y números
    // Las primeras deben ser letras (hasta 3)
    const letrasMatch = val.replace(/-/g, '').match(/^[A-Z]{1,3}/);
    const soloLetras = letrasMatch ? letrasMatch[0] : '';
    const resto = val.replace(/-/g, '').slice(soloLetras.length);

    // Solo dígitos para la segunda parte (hasta 4 dígitos)
    const soloDigitos = resto.replace(/[^0-9]/g, '').slice(0, 4);

    let formateado = soloLetras;
    if (soloDigitos.length > 0 || (soloLetras.length === 3 && val.includes('-'))) {
      formateado = `${soloLetras}-${soloDigitos}`;
    }

    placa.value = formateado;
    validatePlacaOnInput();
    return formateado;
  };

  const validatePlacaOnInput = (): boolean => {
    const val = placa.value.trim();

    if (!val) {
      errorPlaca.value = '';
      helperPlaca.value = '';
      return false;
    }

    // Validación de la primera letra (provincia)
    const primeraLetra = val.charAt(0);
    if (!/[A-Z]/.test(primeraLetra)) {
      errorPlaca.value = 'La placa debe iniciar con una letra';
      helperPlaca.value = '';
      return false;
    }

    if (!(primeraLetra in PROVINCIAS_ECUADOR)) {
      errorPlaca.value = `La letra '${primeraLetra}' no corresponde a una provincia válida del Ecuador`;
      helperPlaca.value = '';
      return false;
    }

    // Chequeo de longitud progresivo
    const partes = val.split('-');
    const letras = partes[0] || '';
    const numeros = partes[1] || '';

    if (letras.length < 3) {
      errorPlaca.value = `Faltan letras: llevas ${letras.length} de 3 letras provinciales`;
      helperPlaca.value = `Provincia detectada: ${PROVINCIAS_ECUADOR[primeraLetra]}`;
      return false;
    }

    if (!numeros) {
      errorPlaca.value = 'Ingresa el número de la placa (3 o 4 dígitos)';
      helperPlaca.value = `Provincia: ${PROVINCIAS_ECUADOR[primeraLetra]}`;
      return false;
    }

    if (numeros.length < 3) {
      errorPlaca.value = `Faltan dígitos: llevas ${numeros.length} (mínimo 3 dígitos)`;
      helperPlaca.value = `Provincia: ${PROVINCIAS_ECUADOR[primeraLetra]}`;
      return false;
    }

    // Es un formato válido según ANT
    if (!Placa.validar(val)) {
      errorPlaca.value = 'Formato de placa inválido. Formato requerido: AAA-1234 o AAA-254';
      helperPlaca.value = '';
      return false;
    }

    // Válido sintácticamente
    errorPlaca.value = '';
    const prov = PROVINCIAS_ECUADOR[primeraLetra];
    helperPlaca.value = `Provincia: ${prov} · Placa válida`;

    // Verificación asíncrona de duplicado si se proveyó la función
    if (checkExistePlaca) {
      if (debounceTimer) clearTimeout(debounceTimer);
      checkingPlaca.value = true;
      debounceTimer = setTimeout(async () => {
        try {
          const existe = await checkExistePlaca(val);
          if (existe) {
            errorPlaca.value = `La placa ${val} ya se encuentra registrada en el sistema`;
            helperPlaca.value = '';
          }
        } catch {
          // Si falla la red no bloqueamos
        } finally {
          checkingPlaca.value = false;
        }
      }, 400);
    }

    return true;
  };

  const resetPlacaValidation = () => {
    placa.value = '';
    errorPlaca.value = '';
    helperPlaca.value = '';
    checkingPlaca.value = false;
    if (debounceTimer) clearTimeout(debounceTimer);
  };

  return {
    placa,
    errorPlaca,
    helperPlaca,
    checkingPlaca,
    isPlacaValid,
    provinciaPlaca,
    formatPlacaOnInput,
    validatePlacaOnInput,
    resetPlacaValidation,
  };
}
