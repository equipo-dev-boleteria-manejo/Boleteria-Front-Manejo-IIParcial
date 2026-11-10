/**
 * useHabilitarRutaFormValidation.ts - Formulario "Programar ruta" con validación en tiempo real
 *
 * Headless: el modal solo enlaza `formulario` con los campos y pinta `erroresVisibles`.
 * Concentra lo que antes vivía dentro del .vue: el autocompletado de modalidad y tiempo de viaje al elegir
 * una frecuencia, la fecha por defecto y la validación del día operativo.
 */
import { computed, reactive, watch } from 'vue';
import type { HabilitarRutaInput } from '../../Application/UseCases/HabilitarRutaDiaria';
import type { Frecuencia } from '../../Domain/Entities/Frecuencia';
import { fechaLocalISO } from './presentacionRutas';
import { useValidacionEnTiempoReal } from './useValidacionEnTiempoReal';
import {
  validarDiaOperativo,
  validarFechaRuta,
  validarObservacionOpcional,
  validarSeleccion,
  validarTiempoViaje,
} from './validacionRutas';

export interface FormularioHabilitarRuta {
  frecuenciaId: number | '';
  busId: number | '';
  fecha: string;
  choferId: string;
  esDirecta: boolean;
  tiempoViajeMinutos: string;
  observacionChofer: string;
}

export interface OpcionesHabilitarRuta {
  frecuencias: () => readonly Frecuencia[];
  esDiaOperativo: (frecuencia: Frecuencia, fecha: string) => boolean;
  /** Fecha de hoy (YYYY-MM-DD); se inyecta para poder probar sin depender del reloj. */
  hoy?: () => string;
}

export function useHabilitarRutaFormValidation(opciones: OpcionesHabilitarRuta) {
  const hoy = opciones.hoy ?? (() => fechaLocalISO());

  const formularioInicial = (fecha?: string): FormularioHabilitarRuta => ({
    frecuenciaId: '',
    busId: '',
    fecha: fecha || hoy(),
    choferId: '',
    esDirecta: true,
    tiempoViajeMinutos: '',
    observacionChofer: '',
  });

  const formulario = reactive<FormularioHabilitarRuta>(formularioInicial());

  const frecuenciaSeleccionada = computed<Frecuencia | null>(() => {
    if (formulario.frecuenciaId === '') return null;
    return opciones.frecuencias().find((frecuencia) => frecuencia.id === Number(formulario.frecuenciaId)) ?? null;
  });

  const { errores, erroresVisibles, esValido, hayErroresVisibles, intentoEnvio, validarTodo, reiniciar, sinMarcar } =
    useValidacionEnTiempoReal(formulario, () => {
      const frecuencia = frecuenciaSeleccionada.value;
      const errorSeleccion = validarSeleccion(formulario.frecuenciaId, 'Selecciona una frecuencia');
      const fechaValida = !validarFechaRuta(formulario.fecha, hoy());

      return {
        // El día operativo depende de la frecuencia y de la fecha: se muestra junto a la frecuencia elegida.
        frecuenciaId:
          errorSeleccion ||
          (frecuencia && fechaValida ? validarDiaOperativo(opciones.esDiaOperativo(frecuencia, formulario.fecha)) : ''),
        busId: validarSeleccion(formulario.busId, 'Selecciona una unidad'),
        fecha: validarFechaRuta(formulario.fecha, hoy()),
        choferId: '',
        // Una frecuencia directa no tiene paradas intermedias: la ruta no puede salir "con paradas".
        esDirecta: frecuencia?.esDirecto && !formulario.esDirecta ? 'Una frecuencia directa no tiene paradas intermedias' : '',
        tiempoViajeMinutos: validarTiempoViaje(formulario.tiempoViajeMinutos),
        observacionChofer: validarObservacionOpcional(formulario.observacionChofer),
      };
    });

  // Al elegir una frecuencia se proponen su modalidad y el tiempo de su última parada (sin marcarlos como tocados).
  watch(frecuenciaSeleccionada, (frecuencia) => {
    if (!frecuencia) return;
    sinMarcar(() => {
      formulario.esDirecta = frecuencia.esDirecto;
      const paradas = frecuencia.obtenerParadasOrdenadas();
      const ultima = paradas[paradas.length - 1];
      formulario.tiempoViajeMinutos = ultima?.minutosDesdeOrigen ? String(ultima.minutosDesdeOrigen) : '';
    });
  });

  /** Deja el formulario limpio, con la fecha indicada o la de hoy. */
  function iniciar(fechaDefecto?: string): void {
    reiniciar(() => Object.assign(formulario, formularioInicial(fechaDefecto)));
  }

  function aInput(): HabilitarRutaInput {
    const tiempo = formulario.tiempoViajeMinutos.trim();

    return {
      frecuenciaId: Number(formulario.frecuenciaId),
      busId: Number(formulario.busId),
      fecha: formulario.fecha,
      choferId: formulario.choferId || undefined,
      esDirecta: formulario.esDirecta,
      horaSalida: frecuenciaSeleccionada.value?.horaSalida || undefined,
      observacionChofer: formulario.observacionChofer.trim() || undefined,
      tiempoViajeMinutos: tiempo ? Number(tiempo) : undefined,
    };
  }

  return {
    formulario,
    errores,
    erroresVisibles,
    esValido,
    hayErroresVisibles,
    intentoEnvio,
    frecuenciaSeleccionada,
    fechaMinima: hoy,
    validarTodo,
    iniciar,
    aInput,
  };
}
