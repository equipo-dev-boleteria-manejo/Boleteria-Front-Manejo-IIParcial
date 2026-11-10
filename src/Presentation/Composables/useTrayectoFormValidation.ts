/**
 * useTrayectoFormValidation.ts - Formulario "Asignar nuevo trayecto" de la hoja de ruta
 *
 * Vincula una unidad a una frecuencia: ambos selects son obligatorios y se validan en tiempo real.
 */
import { reactive } from 'vue';
import { useValidacionEnTiempoReal } from './useValidacionEnTiempoReal';
import { validarSeleccion } from './validacionRutas';

export interface FormularioTrayecto {
  frecuenciaId: number | '';
  busId: number | '';
}

export function useTrayectoFormValidation() {
  const formulario = reactive<FormularioTrayecto>({ frecuenciaId: '', busId: '' });

  const { errores, erroresVisibles, esValido, hayErroresVisibles, intentoEnvio, validarTodo, reiniciar } =
    useValidacionEnTiempoReal(formulario, () => ({
      frecuenciaId: validarSeleccion(formulario.frecuenciaId, 'Selecciona una frecuencia'),
      busId: validarSeleccion(formulario.busId, 'Selecciona una unidad'),
    }));

  function limpiar(): void {
    reiniciar(() => Object.assign(formulario, { frecuenciaId: '', busId: '' }));
  }

  function aDatos(): { frecuenciaId: number; busId: number } {
    return { frecuenciaId: Number(formulario.frecuenciaId), busId: Number(formulario.busId) };
  }

  return { formulario, errores, erroresVisibles, esValido, hayErroresVisibles, intentoEnvio, validarTodo, limpiar, aDatos };
}
