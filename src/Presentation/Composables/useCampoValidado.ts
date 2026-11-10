/**
 * useCampoValidado.ts - Un campo de texto con validación en tiempo real
 *
 * Sirve para formularios de un solo campo: la observación al cerrar un viaje o reportar una novedad y el
 * código de boleto ingresado a mano. Cada uso crea su propia instancia, con errores independientes.
 */
import { computed, reactive } from 'vue';
import { useValidacionEnTiempoReal } from './useValidacionEnTiempoReal';

export function useCampoValidado(validar: (valor: string) => string) {
  const formulario = reactive({ valor: '' });

  const { erroresVisibles, esValido, hayErroresVisibles, validarTodo, reiniciar } = useValidacionEnTiempoReal(
    formulario,
    () => ({ valor: validar(formulario.valor) }),
  );

  /** Mensaje de error a mostrar (solo tras escribir o intentar enviar). */
  const error = computed(() => erroresVisibles.value.valor);
  const texto = computed(() => formulario.valor.trim());

  function iniciar(valor = ''): void {
    reiniciar(() => {
      formulario.valor = valor;
    });
  }

  return { formulario, error, texto, esValido, hayErroresVisibles, validarTodo, iniciar };
}
