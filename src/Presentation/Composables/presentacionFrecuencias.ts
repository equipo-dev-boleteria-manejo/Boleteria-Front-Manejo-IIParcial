/**
 * presentacionFrecuencias.ts - Modelos de presentación y formateadores del módulo de Frecuencias
 *
 * Transforma las entidades de dominio en filas listas para renderizar, de modo que las vistas
 * solo muestren datos y no calculen ni formateen nada en el template.
 */

import {
  DIAS_SEMANA,
  type DiaOperacion,
  type Frecuencia,
  type ParadaIntermedia,
} from '../../Domain/Entities/Frecuencia';

const ABREVIATURA_DIA: Record<DiaOperacion, string> = {
  Lunes: 'Lun',
  Martes: 'Mar',
  Miercoles: 'Mié',
  Jueves: 'Jue',
  Viernes: 'Vie',
  Sabado: 'Sáb',
  Domingo: 'Dom',
};

/** Opciones para los selectores de días: valor de dominio + etiqueta legible. */
export const OPCIONES_DIAS: ReadonlyArray<{ valor: DiaOperacion; etiqueta: string }> = [
  { valor: 'Lunes', etiqueta: 'Lunes' },
  { valor: 'Martes', etiqueta: 'Martes' },
  { valor: 'Miercoles', etiqueta: 'Miércoles' },
  { valor: 'Jueves', etiqueta: 'Jueves' },
  { valor: 'Viernes', etiqueta: 'Viernes' },
  { valor: 'Sabado', etiqueta: 'Sábado' },
  { valor: 'Domingo', etiqueta: 'Domingo' },
];

export interface FilaFrecuencia {
  id: number;
  identificador: string;
  origen: string;
  destino: string;
  ruta: string;
  horaSalida: string;
  tipo: 'Directo' | 'Con paradas';
  dias: string;
  totalParadas: number;
  tiempoUltimaParada: string;
  codigoAnt: string;
  activa: boolean;
}

export interface FilaParada {
  id: number;
  orden: number;
  ciudad: string;
  tiempo: string;
  minutosDesdeOrigen: number;
  permiteVenta: boolean;
  costo: string;
}

/** 0 -> '0 min', 90 -> '1 h 30 min', 120 -> '2 h'. */
export function formatearMinutos(minutos: number): string {
  const total = Math.max(0, Math.round(minutos));
  const horas = Math.floor(total / 60);
  const resto = total % 60;

  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

/** Los 7 días -> 'Todos los días'; en otro caso, abreviaturas en orden de semana. */
export function resumirDias(dias: readonly DiaOperacion[]): string {
  const operados = DIAS_SEMANA.filter((dia) => dias.includes(dia));

  if (operados.length === DIAS_SEMANA.length) return 'Todos los días';
  if (operados.length === 0) return 'Sin días';
  return operados.map((dia) => ABREVIATURA_DIA[dia]).join(', ');
}

export function formatearCosto(costo: number): string {
  return costo > 0 ? `$${costo.toFixed(2)}` : '—';
}

export function aFilaParada(parada: ParadaIntermedia): FilaParada {
  return {
    id: parada.id ?? 0,
    orden: parada.orden,
    ciudad: parada.ciudad,
    tiempo: formatearMinutos(parada.minutosDesdeOrigen),
    minutosDesdeOrigen: parada.minutosDesdeOrigen,
    permiteVenta: parada.permiteVenta,
    costo: formatearCosto(parada.costoProporcional),
  };
}

export function aFilaFrecuencia(frecuencia: Frecuencia): FilaFrecuencia {
  const paradas = frecuencia.obtenerParadasOrdenadas();
  const ultima = paradas[paradas.length - 1];

  return {
    id: frecuencia.id ?? 0,
    identificador: frecuencia.identificadorFrecuencia,
    origen: frecuencia.ciudadOrigen,
    destino: frecuencia.ciudadDestino,
    ruta: `${frecuencia.ciudadOrigen} → ${frecuencia.ciudadDestino}`,
    horaSalida: frecuencia.horaSalida,
    tipo: frecuencia.esDirecto ? 'Directo' : 'Con paradas',
    dias: resumirDias(frecuencia.diasOperacion),
    totalParadas: paradas.length,
    tiempoUltimaParada: ultima ? formatearMinutos(ultima.minutosDesdeOrigen) : 'Sin estimar',
    codigoAnt: frecuencia.codigoAnt ?? '—',
    activa: frecuencia.activa,
  };
}

/** Orden que sigue a la última parada: evita que la vista calcule el siguiente número. */
export function siguienteOrdenParada(frecuencia: Frecuencia | null): number {
  if (!frecuencia) return 1;
  return frecuencia.paradas.reduce((maximo, parada) => Math.max(maximo, parada.orden), 0) + 1;
}
