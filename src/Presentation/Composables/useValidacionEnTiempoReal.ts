/**
 * useValidacionEnTiempoReal.ts - Motor genérico de validación reactiva para formularios
 *
 * - `errores`: mensaje de cada campo según las reglas (siempre calculado).
 * - `erroresVisibles`: solo los campos que el usuario ya tocó, o todos tras intentar enviar.
 *   Así el formulario no nace en rojo, pero reacciona mientras se escribe.
 * - `validarTodo()`: marca el intento de envío (muestra todos los errores) y dice si se puede enviar.
 * - `reiniciar(fn)`: ejecuta `fn` (que reasigna el formulario) sin contar esos cambios como "tocados".
 */
import { computed, reactive, ref, watch } from 'vue';

export function useValidacionEnTiempoReal<T extends object>(
  formulario: T,
  validar: () => Record<keyof T, string>,
) {
  const claves = Object.keys(formulario) as Array<keyof T>;
  const tocados = reactive({}) as Record<keyof T, boolean>;
  const intentoEnvio = ref(false);
  let pausado = false;

  for (const clave of claves) {
    watch(
      () => formulario[clave],
      () => {
        if (!pausado) tocados[clave] = true;
      },
      { flush: 'sync', deep: true },
    );
  }

  const errores = computed(() => validar());

  const erroresVisibles = computed(() => {
    const visibles = {} as Record<keyof T, string>;
    for (const clave of claves) {
      visibles[clave] = intentoEnvio.value || tocados[clave] ? errores.value[clave] : '';
    }
    return visibles;
  });

  const esValido = computed(() => claves.every((clave) => !errores.value[clave]));
  const hayErroresVisibles = computed(() => claves.some((clave) => !!erroresVisibles.value[clave]));

  function validarTodo(): boolean {
    intentoEnvio.value = true;
    return esValido.value;
  }

  /** Ejecuta `asignar` sin que sus cambios cuenten como "campo tocado". */
  function sinMarcar(asignar: () => void): void {
    pausado = true;
    try {
      asignar();
    } finally {
      pausado = false;
    }
  }

  function reiniciar(asignar: () => void): void {
    sinMarcar(asignar);
    for (const clave of claves) tocados[clave] = false;
    intentoEnvio.value = false;
  }

  return {
    errores,
    erroresVisibles,
    esValido,
    hayErroresVisibles,
    intentoEnvio,
    validarTodo,
    reiniciar,
    sinMarcar,
  };
}
