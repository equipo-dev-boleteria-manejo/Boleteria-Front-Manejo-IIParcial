/**
 * useChoferRuta.ts - Composable Reactivo para la Operación del Chofer
 *
 * Arquitectura:
 * - Capa de Presentación Desacoplada (Headless).
 * - Reactividad pura (refs, computeds, loading, error, success, historial).
 * - Cero lógica de negocio directa: orquesta GestionarViajeRuta y ValidarBoletoRuta.
 * - Soporta inyección de dependencias (DIP).
 */

import { ref, computed } from 'vue';
import type { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import type { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository';
import type { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import {
  GestionarViajeRuta,
  gestionarViajeRutaUseCase as defaultGestionarViaje,
} from '../../Application/UseCases/GestionarViajeRuta';
import {
  ValidarBoletoRuta,
  validarBoletoRutaUseCase as defaultValidarBoleto,
} from '../../Application/UseCases/ValidarBoletoRuta';
import { SupabaseRutaRepository } from '../../Infrastructure/Repositories/SupabaseRutaRepository';
import { SupabaseBoletosRepository } from '../../Infrastructure/Repositories/SupabaseBoletosRepository';
import { SupabaseBusRepository } from '../../Infrastructure/Repositories/SupabaseBusRepository';

export interface ValidacionHistorialItem {
  codigo: string;
  hora: string;
  resultado: string;
}

export interface ResultadoOperacionChofer {
  ok: boolean;
  mensaje: string;
}

export function useChoferRuta(
  rutaRepo: IRutaRepository = new SupabaseRutaRepository(),
  boletosRepo?: IBoletosRepository,
  busRepo?: IBusRepository,
  gestionarViajeUseCase?: GestionarViajeRuta,
  validarBoletoUseCase?: ValidarBoletoRuta,
) {
  const viajeUseCase = gestionarViajeUseCase || new GestionarViajeRuta(rutaRepo);
  const boletoUseCase =
    validarBoletoUseCase ||
    (boletosRepo ? new ValidarBoletoRuta(boletosRepo) : defaultValidarBoleto);

  const rutaActual = ref<Ruta | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const success = ref<string | null>(null);
  const resultado = ref<string | null>(null);
  const pasajeros = ref<any[]>([]);
  const historial = ref<ValidacionHistorialItem[]>([]);

  const rutaProgramada = computed(
    () => rutaActual.value?.estado === EstadoRuta.PROGRAMADA
  );

  const rutaEnCurso = computed(
    () => rutaActual.value?.estado === EstadoRuta.EN_CURSO
  );

  const rutaCompletada = computed(
    () => rutaActual.value?.estado === EstadoRuta.FINALIZADA
  );

  const rutaCancelada = computed(
    () => rutaActual.value?.estado === EstadoRuta.CANCELADA
  );

  const minutosDesdeSalida = computed(() => {
    if (!rutaActual.value?.horaSalida) return 0;
    const [h, m] = rutaActual.value.horaSalida.split(':').map(Number);
    const ahora = new Date();
    const minutosSalida = (h || 0) * 60 + (m || 0);
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    return Math.max(0, minutosAhora - minutosSalida);
  });

  const requiereObservacionPorTiempo = computed(() => {
    const tiempoEsperado = rutaActual.value?.tiempoViajeMinutos || 180;
    return minutosDesdeSalida.value > tiempoEsperado + 30;
  });

  async function cargarRutaChofer(
    choferId: string,
    fecha?: string
  ): Promise<Ruta | null> {
    loading.value = true;
    error.value = null;

    try {
      const fechaConsulta = fecha || new Date().toISOString().slice(0, 10);
      const rutas = await rutaRepo.obtenerPorChoferYFecha(choferId, fechaConsulta);

      // Priorizar ruta en curso, luego programada
      const activa =
        rutas.find((r) => r.estado === EstadoRuta.EN_CURSO) ||
        rutas.find((r) => r.estado === EstadoRuta.PROGRAMADA) ||
        (rutas.length > 0 ? (rutas[0] ?? null) : null);

      rutaActual.value = activa;
      return activa;
    } catch (err: any) {
      error.value = err.message || 'Error al cargar ruta asignada al chofer.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function iniciarViaje(): Promise<ResultadoOperacionChofer> {
    loading.value = true;
    error.value = null;
    success.value = null;

    try {
      if (!rutaActual.value || !rutaActual.value.id) {
        throw new Error('No hay una ruta asignada para iniciar.');
      }

      const actualizada = await viajeUseCase.iniciarViaje(rutaActual.value.id);
      rutaActual.value = actualizada;
      success.value = 'Viaje iniciado correctamente.';
      resultado.value = success.value;

      return { ok: true, mensaje: success.value };
    } catch (err: any) {
      error.value = err.message || 'Error al iniciar viaje.';
      resultado.value = error.value;
      return { ok: false, mensaje: error.value };
    } finally {
      loading.value = false;
    }
  }

  async function finalizarViaje(
    observacion?: string
  ): Promise<ResultadoOperacionChofer> {
    loading.value = true;
    error.value = null;
    success.value = null;

    try {
      if (!rutaActual.value || !rutaActual.value.id) {
        throw new Error('No hay una ruta asignada para finalizar.');
      }

      const actualizada = await viajeUseCase.finalizarViaje(
        rutaActual.value.id,
        observacion
      );
      rutaActual.value = actualizada;
      success.value = 'Viaje finalizado correctamente.';
      resultado.value = success.value;

      return { ok: true, mensaje: success.value };
    } catch (err: any) {
      error.value = err.message || 'Error al finalizar viaje.';
      resultado.value = error.value;
      return { ok: false, mensaje: error.value };
    } finally {
      loading.value = false;
    }
  }

  async function marcarEmergencia(
    observacion: string
  ): Promise<ResultadoOperacionChofer> {
    loading.value = true;
    error.value = null;
    success.value = null;

    try {
      if (!rutaActual.value || !rutaActual.value.id) {
        throw new Error('No hay una ruta activa para registrar emergencia.');
      }

      const actualizada = await viajeUseCase.registrarEmergencia(
        rutaActual.value.id,
        observacion
      );
      rutaActual.value = actualizada;
      success.value = 'Emergencia registrada correctamente.';
      resultado.value = success.value;

      return { ok: true, mensaje: success.value };
    } catch (err: any) {
      error.value = err.message || 'Error al registrar emergencia.';
      resultado.value = error.value;
      return { ok: false, mensaje: error.value };
    } finally {
      loading.value = false;
    }
  }

  async function validarQrBoleto(codigo: string): Promise<ResultadoOperacionChofer> {
    loading.value = true;
    error.value = null;
    success.value = null;

    const codigoLimpio = codigo ? codigo.trim() : '';

    try {
      const res = await boletoUseCase.ejecutar({
        ruta: rutaActual.value,
        codigo: codigoLimpio,
      });

      const ahora = new Date();
      const horaStr = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

      historial.value.unshift({
        codigo: codigoLimpio,
        hora: horaStr,
        resultado: 'Validado',
      });

      success.value = res.mensaje || 'Boleto validado correctamente.';
      resultado.value = success.value;

      return { ok: true, mensaje: success.value };
    } catch (err: any) {
      error.value = err.message || 'Error al validar boleto.';
      resultado.value = error.value;

      if (codigoLimpio) {
        const ahora = new Date();
        const horaStr = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
        historial.value.unshift({
          codigo: codigoLimpio,
          hora: horaStr,
          resultado: error.value,
        });
      }

      return { ok: false, mensaje: error.value };
    } finally {
      loading.value = false;
    }
  }

  function limpiar(): void {
    rutaActual.value = null;
    loading.value = false;
    error.value = null;
    success.value = null;
    resultado.value = null;
    pasajeros.value = [];
    historial.value = [];
  }

  return {
    rutaActual,
    pasajeros,
    historial,
    loading,
    error,
    success,
    resultado,
    rutaProgramada,
    rutaEnCurso,
    rutaCompletada,
    rutaCancelada,
    minutosDesdeSalida,
    requiereObservacionPorTiempo,
    cargarRutaChofer,
    iniciarViaje,
    finalizarViaje,
    marcarEmergencia,
    validarQrBoleto,
    limpiar,
  };
}
