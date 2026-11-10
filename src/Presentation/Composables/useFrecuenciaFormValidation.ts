/**
 * useFrecuenciaFormValidation.ts - Formulario de frecuencia (crear / editar) con validación en tiempo real
 *
 * Headless: el componente solo enlaza `formulario` con los inputs y pinta `erroresVisibles`.
 * Sirve para ambos modos: en edición se precarga con `reiniciar(datos)`.
 */
import { computed, reactive, ref } from 'vue';
import type { ActualizarFrecuenciaDto, CrearFrecuenciaDto } from '../../Application/Dtos/CrearFrecuenciaDto';
import type { DiaOperacion } from '../../Domain/Entities/Frecuencia';
import { OPCIONES_DIAS, type DatosEdicionFrecuencia } from './presentacionFrecuencias';
import { useValidacionEnTiempoReal } from './useValidacionEnTiempoReal';
import {
  MAX_CODIGO_ANT,
  MAX_RESOLUCION_ANT,
  validarCooperativa,
  validarDestino,
  validarDias,
  avisoDirecto,
  validarHora,
  validarIdentificador,
  validarOrigen,
  validarTextoOpcional,
} from './validacionFrecuencia';

export interface FormularioFrecuencia {
  cooperativaId: string;
  ciudadOrigen: string;
  ciudadDestino: string;
  horaSalida: string;
  identificadorFrecuencia: string;
  codigoAnt: string;
  resolucionAnt: string;
  esDirecto: boolean;
  diasOperacion: DiaOperacion[];
}

/** Datos con los que se precarga el formulario al editar. */
export type DatosFrecuenciaEditable = Partial<DatosEdicionFrecuencia>;

export const todosLosDias = (): DiaOperacion[] => OPCIONES_DIAS.map((opcion) => opcion.valor) as DiaOperacion[];

export const formularioFrecuenciaInicial = (): FormularioFrecuencia => ({
  cooperativaId: '',
  ciudadOrigen: '',
  ciudadDestino: '',
  horaSalida: '',
  identificadorFrecuencia: '',
  codigoAnt: '',
  resolucionAnt: '',
  esDirecto: true,
  diasOperacion: todosLosDias(),
});

/**
 * @param requiereCooperativa si es true, el campo cooperativa es obligatorio
 *        (solo cuando la sesión no trae una cooperativa asignada).
 */
export function useFrecuenciaFormValidation(requiereCooperativa: () => boolean = () => false) {
  const formulario = reactive<FormularioFrecuencia>(formularioFrecuenciaInicial());
  /** Paradas que ya tiene la frecuencia que se edita (0 al registrar una nueva). */
  const paradasExistentes = ref(0);
  /** Huella de los datos precargados al editar; null cuando se registra una frecuencia nueva. */
  const huellaOriginal = ref<string | null>(null);

  const { errores, erroresVisibles, esValido, hayErroresVisibles, intentoEnvio, validarTodo, reiniciar } =
    useValidacionEnTiempoReal(
    formulario,
    () => ({
      cooperativaId: requiereCooperativa() ? validarCooperativa(formulario.cooperativaId) : '',
      ciudadOrigen: validarOrigen(formulario.ciudadOrigen),
      ciudadDestino: validarDestino(formulario.ciudadDestino, formulario.ciudadOrigen),
      horaSalida: validarHora(formulario.horaSalida),
      identificadorFrecuencia: validarIdentificador(formulario.identificadorFrecuencia),
      codigoAnt: validarTextoOpcional(formulario.codigoAnt, 'El código ANT', MAX_CODIGO_ANT),
      resolucionAnt: validarTextoOpcional(formulario.resolucionAnt, 'La resolución ANT', MAX_RESOLUCION_ANT),
      esDirecto: '',
      diasOperacion: validarDias(formulario.diasOperacion),
    }),
  );

  /** Deja el formulario limpio (crear) o precargado (editar), sin mostrar errores. */
  function iniciar(datos?: DatosFrecuenciaEditable): void {
    const { totalParadas = 0, ...campos } = datos ?? {};
    paradasExistentes.value = totalParadas;
    reiniciar(() => {
      const base = formularioFrecuenciaInicial();
      Object.assign(formulario, base, campos, {
        cooperativaId: String(campos.cooperativaId ?? base.cooperativaId),
        diasOperacion: [...(campos.diasOperacion ?? base.diasOperacion)],
      });
    });
    huellaOriginal.value = datos ? huella() : null;
  }

  /** Representación comparable de lo editable (días en orden de semana, textos sin espacios sobrantes). */
  function huella(): string {
    const indice = (dia: DiaOperacion) => OPCIONES_DIAS.findIndex((opcion) => opcion.valor === dia);
    return JSON.stringify({
      ...aCambios(),
      diasOperacion: [...formulario.diasOperacion].sort((a, b) => indice(a) - indice(b)),
    });
  }

  /** Aviso informativo (no bloquea): guardar como directa elimina las paradas existentes. */
  const mensajeDirecto = computed(() => avisoDirecto(formulario.esDirecto, paradasExistentes.value));

  /** En edición: indica si el usuario modificó algo respecto a lo precargado. */
  const hayCambios = computed(() => huellaOriginal.value === null || huella() !== huellaOriginal.value);

  /** Valores normalizados (sin espacios sobrantes) listos para enviar. */
  function aDto(cooperativaId: number): CrearFrecuenciaDto {
    return {
      cooperativaId,
      ciudadOrigen: formulario.ciudadOrigen.trim(),
      ciudadDestino: formulario.ciudadDestino.trim(),
      horaSalida: formulario.horaSalida.trim(),
      identificadorFrecuencia: formulario.identificadorFrecuencia.trim(),
      esDirecto: formulario.esDirecto,
      diasOperacion: [...formulario.diasOperacion],
      codigoAnt: formulario.codigoAnt.trim(),
      resolucionAnt: formulario.resolucionAnt.trim(),
    };
  }

  /** Solo los campos modificables de una frecuencia existente (identificador y cooperativa son inmutables). */
  function aCambios(): ActualizarFrecuenciaDto {
    const { cooperativaId: _cooperativa, identificadorFrecuencia: _identificador, ...cambios } = aDto(0);
    return cambios;
  }

  return {
    formulario,
    errores,
    erroresVisibles,
    esValido,
    hayErroresVisibles,
    hayCambios,
    mensajeDirecto,
    intentoEnvio,
    validarTodo,
    iniciar,
    aDto,
    aCambios,
  };
}
