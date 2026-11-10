/**
 * rutasDisponibles.ts - Utilidades de presentación para cruzar Rutas con su
 * Frecuencia y Bus antes de mostrarlas en las vistas de venta.
 */

import { EstadoRuta } from '../../Domain/Constants/EstadosSistema'
import type { Bus } from '../../Domain/Entities/Bus'
import type { Frecuencia } from '../../Domain/Entities/Frecuencia'
import type { Ruta } from '../../Domain/Entities/Ruta'

export interface RutaDisponible {
  ruta: Ruta
  frecuencia: Frecuencia | null
  bus: Bus | null
  origen: string
  destino: string
  fecha: string
  horaSalida: string
  esDirecta: boolean
  totalAsientos: number
  estructura: string
  estado: string
}

export interface OpcionesRutasDisponibles {
  incluirNoVendibles?: boolean
  incluirFrecuenciasInactivas?: boolean
}

function indexarPorId<T extends { id?: number }>(items: T[]): Map<number, T> {
  const mapa = new Map<number, T>()
  items.forEach((item) => {
    if (item.id !== undefined) mapa.set(item.id, item)
  })
  return mapa
}

export function construirRutasDisponibles(
  rutas: Ruta[],
  frecuencias: Frecuencia[],
  buses: Bus[],
  opciones: OpcionesRutasDisponibles = {},
): RutaDisponible[] {
  const {
    incluirNoVendibles = false,
    incluirFrecuenciasInactivas = false,
  } = opciones

  const frecuenciasPorId = indexarPorId(frecuencias)
  const busesPorId = indexarPorId(buses)

  return rutas
    .filter((ruta) => {
      if (incluirNoVendibles) return true
      if (
        ruta.estado === EstadoRuta.CANCELADA ||
        ruta.estado === EstadoRuta.FINALIZADA
      ) {
        return false
      }

      const frecuencia = frecuenciasPorId.get(ruta.frecuenciaId)
      if (
        !incluirFrecuenciasInactivas &&
        frecuencia &&
        frecuencia.activa === false
      ) {
        return false
      }

      return true
    })
    .map((ruta) => {
      const frecuencia = frecuenciasPorId.get(ruta.frecuenciaId) ?? null
      const bus = busesPorId.get(ruta.busId) ?? null

      return {
        ruta,
        frecuencia,
        bus,
        origen: frecuencia?.ciudadOrigen ?? 'Origen no registrado',
        destino: frecuencia?.ciudadDestino ?? 'Destino no registrado',
        fecha: ruta.fecha,
        horaSalida: ruta.horaSalida ?? frecuencia?.horaSalida ?? '',
        esDirecta: ruta.esDirecta ?? frecuencia?.esDirecto ?? true,
        totalAsientos: bus?.totalAsientos ?? 0,
        estructura: bus?.estructura ?? 'UnPiso',
        estado: ruta.estado,
      }
    })
    .sort((a, b) => {
      const porFecha = a.fecha.localeCompare(b.fecha)
      if (porFecha !== 0) return porFecha
      return (a.horaSalida || '99:99').localeCompare(b.horaSalida || '99:99')
    })
}

export function formatearFechaRuta(fecha: string): string {
  if (!fecha) return 'Fecha por confirmar'
  const fechaDate = new Date(`${fecha}T00:00:00`)
  if (Number.isNaN(fechaDate.getTime())) return fecha
  return fechaDate.toLocaleDateString('es-EC', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatearHora(hora?: string | null): string {
  return hora ? hora.slice(0, 5) : 'Hora por confirmar'
}
