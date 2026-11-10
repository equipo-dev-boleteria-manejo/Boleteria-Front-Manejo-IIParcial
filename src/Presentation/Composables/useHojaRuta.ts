/**
 * useHojaRuta.ts - Composable Reactivo para Administración de Hojas de Ruta
 *
 * Arquitectura:
 * - Capa de Presentación Desacoplada (Headless).
 * - Orquesta los casos de uso GestionarHojaRuta y AsignarRutaAHoja.
 * - Soporta inyección de dependencias para tests unitarios aislados.
 */

import { ref } from 'vue';
import type { HojaRuta } from '../../Domain/Entities/HojaRuta';
import type { Ruta } from '../../Domain/Entities/Ruta';
import {
  CambiarModalidadRuta,
  cambiarModalidadRutaUseCase as defaultCambiarModalidadRuta,
} from '../../Application/UseCases/CambiarModalidadRuta';
import { mensajeErrorParaUsuario } from '../Utils/errorMessage';
import {
  GestionarHojaRuta,
  gestionarHojaRutaUseCase as defaultGestionarHojaRuta,
} from '../../Application/UseCases/GestionarHojaRuta';
import {
  AsignarRutaAHoja,
  asignarRutaAHojaUseCase as defaultAsignarRutaAHoja,
} from '../../Application/UseCases/AsignarRutaAHoja';

export function useHojaRuta(
  gestionarUseCase: GestionarHojaRuta = defaultGestionarHojaRuta,
  asignarUseCase: AsignarRutaAHoja = defaultAsignarRutaAHoja,
  cambiarModalidadUseCase: CambiarModalidadRuta = defaultCambiarModalidadRuta,
) {
  const hojasRuta = ref<HojaRuta[]>([]);
  const hojaActual = ref<HojaRuta | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function cargarPorFecha(fecha: string): Promise<HojaRuta[]> {
    loading.value = true;
    error.value = null;

    try {
      const lista = await gestionarUseCase.listarPorFecha(fecha);
      hojasRuta.value = lista;
      hojaActual.value = lista.length > 0 ? (lista[0] ?? null) : null;
      return lista;
    } catch (err: unknown) {
      error.value = mensajeErrorParaUsuario(err, 'Error al cargar hojas de ruta.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function crearHojaDia(fecha: string, usuarioCreadorId?: string): Promise<HojaRuta> {
    loading.value = true;
    error.value = null;

    try {
      const nueva = await gestionarUseCase.crearHojaDia(fecha, usuarioCreadorId);
      hojaActual.value = nueva;
      await cargarPorFecha(fecha);
      return nueva;
    } catch (err: unknown) {
      error.value = mensajeErrorParaUsuario(err, 'Error al crear hoja de ruta del día.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function agregarTrayecto(
    busId: number,
    frecuenciaId: number,
    fecha: string,
    usuarioCreadorId?: string,
  ): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      const res = await asignarUseCase.ejecutar({
        busId,
        frecuenciaId,
        fecha,
        usuarioCreadorId,
      });

      if (!res.success) {
        error.value = res.error || 'Error al asignar el trayecto.';
        return false;
      }

      await cargarPorFecha(fecha);
      return true;
    } catch (err: unknown) {
      error.value = mensajeErrorParaUsuario(err, 'Error al asignar trayecto a la hoja de ruta.');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function iniciarHoja(id: number, fecha?: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await gestionarUseCase.iniciarRuta(id);
      if (fecha) {
        await cargarPorFecha(fecha);
      }
    } catch (err: unknown) {
      error.value = mensajeErrorParaUsuario(err, 'Error al iniciar la hoja de ruta.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function finalizarHoja(id: number, fecha?: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await gestionarUseCase.finalizarRuta(id);
      if (fecha) {
        await cargarPorFecha(fecha);
      }
    } catch (err: unknown) {
      error.value = mensajeErrorParaUsuario(err, 'Error al finalizar la hoja de ruta.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function cancelarHoja(id: number, motivo?: string, fecha?: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await gestionarUseCase.cancelarRuta(id, motivo);
      if (fecha) {
        await cargarPorFecha(fecha);
      }
    } catch (err: unknown) {
      error.value = mensajeErrorParaUsuario(err, 'Error al cancelar la hoja de ruta.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function toggleTipoRuta(ruta: Ruta, fecha?: string): Promise<boolean> {
    if (!ruta.id) {
      error.value = 'No se puede cambiar la modalidad de una ruta sin identificador.';
      return false;
    }
    loading.value = true;
    error.value = null;

    try {
      await cambiarModalidadUseCase.ejecutar(ruta.id, !ruta.esDirecta);
      if (fecha) {
        await cargarPorFecha(fecha);
      }
      return true;
    } catch (err: unknown) {
      error.value = mensajeErrorParaUsuario(err, 'Error al alternar tipo de ruta.');
      return false;
    } finally {
      loading.value = false;
    }
  }

  function limpiar(): void {
    hojasRuta.value = [];
    hojaActual.value = null;
    loading.value = false;
    error.value = null;
  }

  return {
    hojasRuta,
    hojaActual,
    loading,
    error,
    cargarPorFecha,
    crearHojaDia,
    agregarTrayecto,
    iniciarHoja,
    finalizarHoja,
    cancelarHoja,
    toggleTipoRuta,
    limpiar,
  };
}
