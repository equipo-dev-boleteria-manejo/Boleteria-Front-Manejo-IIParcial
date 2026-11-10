/**
 * useParadaFormValidation.ts - Formulario de parada (agregar / editar) con validación en tiempo real
 *
 * Recibe getters para reaccionar a los cambios de la frecuencia: ciudades extremo (no pueden
 * repetirse como parada), órdenes ya usados y orden sugerido.
 * Para editar, `cargar(parada)` precarga el formulario; el orden de esa parada deja de contar como repetido.
 */
import { computed, reactive, ref } from 'vue';
import type { ParadaIntermediaDto } from '../../Application/Dtos/CrearFrecuenciaDto';
import type { FilaParada } from './presentacionFrecuencias';
import { useValidacionEnTiempoReal } from './useValidacionEnTiempoReal';
import {
  validarCiudadParada,
  validarCostoParada,
  validarMinutosParada,
  validarOrden,
} from './validacionFrecuencia';

export interface FormularioParada {
  ciudad: string;
  orden: string;
  minutosDesdeOrigen: string;
  costoProporcional: string;
  permiteVenta: boolean;
}

export interface OpcionesFormularioParada {
  extremos?: () => readonly string[];
  ordenesExistentes?: () => readonly number[];
  ordenSugerido?: () => number;
}

export function useParadaFormValidation(opciones: OpcionesFormularioParada = {}) {
  const extremos = opciones.extremos ?? (() => []);
  const ordenesExistentes = opciones.ordenesExistentes ?? (() => []);
  const ordenSugerido = opciones.ordenSugerido ?? (() => 1);

  /** Parada que se está editando; null cuando el formulario agrega una nueva. */
  const editandoId = ref<number | null>(null);
  const ordenOriginal = ref<number | null>(null);
  const estaEditando = computed(() => editandoId.value !== null);
  /** Huella de la parada precargada para detectar si se modificó algo. */
  const huellaOriginal = ref<string | null>(null);

  const formularioInicial = (): FormularioParada => ({
    ciudad: '',
    orden: String(ordenSugerido()),
    minutosDesdeOrigen: '',
    costoProporcional: '',
    permiteVenta: true,
  });

  const formulario = reactive<FormularioParada>(formularioInicial());

  const { errores, erroresVisibles, esValido, hayErroresVisibles, intentoEnvio, validarTodo, reiniciar, sinMarcar } =
    useValidacionEnTiempoReal(formulario, () => ({
      ciudad: validarCiudadParada(formulario.ciudad, extremos()),
      orden: validarOrden(
        formulario.orden,
        ordenesExistentes().filter((orden) => orden !== ordenOriginal.value),
      ),
      minutosDesdeOrigen: validarMinutosParada(formulario.minutosDesdeOrigen),
      costoProporcional: validarCostoParada(formulario.costoProporcional),
      permiteVenta: '',
    }));

  /** Sale del modo edición y deja el formulario vacío con el siguiente orden sugerido. */
  function limpiar(): void {
    editandoId.value = null;
    ordenOriginal.value = null;
    huellaOriginal.value = null;
    reiniciar(() => Object.assign(formulario, formularioInicial()));
  }

  /** Precarga el formulario con una parada existente para editarla. */
  function cargar(parada: FilaParada): void {
    editandoId.value = parada.id;
    ordenOriginal.value = parada.orden;
    reiniciar(() =>
      Object.assign(formulario, {
        ciudad: parada.ciudad,
        orden: String(parada.orden),
        minutosDesdeOrigen: String(parada.minutosDesdeOrigen),
        costoProporcional: parada.costoProporcional > 0 ? String(parada.costoProporcional) : '',
        permiteVenta: parada.permiteVenta,
      }),
    );
    huellaOriginal.value = JSON.stringify(aDto());
  }

  /** En edición: indica si el usuario modificó algo respecto a la parada precargada. */
  const hayCambios = computed(() => huellaOriginal.value === null || JSON.stringify(aDto()) !== huellaOriginal.value);

  /** Solo actualiza el orden (cuando la lista cambia) sin marcarlo como tocado; no pisa una edición. */
  function sugerirOrden(orden: number): void {
    if (estaEditando.value) return;
    sinMarcar(() => {
      formulario.orden = String(orden);
    });
  }

  function aDto(): ParadaIntermediaDto {
    return {
      ciudad: formulario.ciudad.trim(),
      orden: Number(formulario.orden),
      minutosDesdeOrigen: Number(formulario.minutosDesdeOrigen),
      permiteVenta: formulario.permiteVenta,
      costoProporcional: formulario.costoProporcional.trim() === '' ? 0 : Number(formulario.costoProporcional),
    };
  }

  return {
    formulario,
    errores,
    erroresVisibles,
    esValido,
    hayErroresVisibles,
    hayCambios,
    intentoEnvio,
    editandoId,
    estaEditando,
    validarTodo,
    limpiar,
    cargar,
    sugerirOrden,
    aDto,
  };
}
