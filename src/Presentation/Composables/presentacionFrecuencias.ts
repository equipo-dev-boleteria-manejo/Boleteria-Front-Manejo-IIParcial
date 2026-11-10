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
  /** Frecuencia con paradas que aún no tiene ninguna: debe completarse antes de operar. */
  faltanParadas: boolean;
}

export interface FilaParada {
  id: number;
  orden: number;
  ciudad: string;
  tiempo: string;
  minutosDesdeOrigen: number;
  permiteVenta: boolean;
  costo: string;
  /** Valor numérico del costo, para precargar el formulario de edición. */
  costoProporcional: number;
}

/** Quita el prefijo técnico de las excepciones de dominio: "[FrecuenciaException] Texto" -> "Texto". */
export function mensajeLegible(mensaje: string): string {
    return mensaje.replace(/^\[[A-Za-z]+Exception\]\s*/, '').trim();
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
    costoProporcional: parada.costoProporcional,
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
    codigoAnt: frecuencia.codigoAnt?.trim() || '—',
    activa: frecuencia.activa,
    faltanParadas: frecuencia.estaIncompleta(),
  };
}

/** Datos que el formulario de edición precarga a partir de una frecuencia existente. */
export interface DatosEdicionFrecuencia {
  cooperativaId: number;
  identificadorFrecuencia: string;
  ciudadOrigen: string;
  ciudadDestino: string;
  horaSalida: string;
  esDirecto: boolean;
  diasOperacion: DiaOperacion[];
  codigoAnt: string;
  resolucionAnt: string;
  /** Paradas que ya tiene: una frecuencia con paradas no puede pasar a directa. */
  totalParadas: number;
}

/** Guardar como directa una frecuencia que tiene paradas obliga a eliminarlas (una directa no las lleva). */
export function eliminaParadasAlGuardar(
  datos: DatosEdicionFrecuencia | null,
  cambios: { esDirecto?: boolean },
): boolean {
  return datos !== null && datos.totalParadas > 0 && cambios.esDirecto === true;
}

export function aDatosEdicion(frecuencia: Frecuencia): DatosEdicionFrecuencia {
  return {
    cooperativaId: frecuencia.cooperativaId,
    identificadorFrecuencia: frecuencia.identificadorFrecuencia,
    ciudadOrigen: frecuencia.ciudadOrigen,
    ciudadDestino: frecuencia.ciudadDestino,
    // La base puede devolver HH:mm:ss; el campo de hora trabaja con HH:mm.
    horaSalida: frecuencia.horaSalida.slice(0, 5),
    esDirecto: frecuencia.esDirecto,
    diasOperacion: [...frecuencia.diasOperacion],
    codigoAnt: frecuencia.codigoAnt ?? '',
    resolucionAnt: frecuencia.resolucionAnt ?? '',
    totalParadas: frecuencia.paradas.length,
  };
}

/** Orden que sigue a la última parada: evita que la vista calcule el siguiente número. */
export function siguienteOrdenParada(frecuencia: Frecuencia | null): number {
  if (!frecuencia) return 1;
  return frecuencia.paradas.reduce((maximo, parada) => Math.max(maximo, parada.orden), 0) + 1;
}

/** Opciones del filtro de estado de la barra de búsqueda. */
export const OPCIONES_FILTRO_ESTADO: Array<{ value: FiltroEstado; label: string }> = [
  { value: 'Todas', label: 'Todas' },
  { value: 'Activas', label: 'Activas' },
  { value: 'Inactivas', label: 'Inactivas' },
];

export type FiltroEstado = 'Todas' | 'Activas' | 'Inactivas';

export interface ResumenFrecuencias {
  total: number;
  activas: number;
  inactivas: number;
  conParadas: number;
}

/** Cifras para las tarjetas de métricas de la vista. */
export function resumirFrecuencias(frecuencias: readonly Frecuencia[]): ResumenFrecuencias {
  const activas = frecuencias.filter((frecuencia) => frecuencia.activa).length;

  return {
    total: frecuencias.length,
    activas,
    inactivas: frecuencias.length - activas,
    conParadas: frecuencias.filter((frecuencia) => frecuencia.paradas.length > 0).length,
  };
}

const normalizarTexto = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * Filtra las filas por texto (identificador, código ANT, origen o destino, sin distinguir
 * mayúsculas ni tildes) y por estado.
 */
export function filtrarFilas(
  filas: readonly FilaFrecuencia[],
  busqueda: string,
  estado: FiltroEstado,
): FilaFrecuencia[] {
  const termino = normalizarTexto(busqueda);

  return filas.filter((fila) => {
    if (estado === 'Activas' && !fila.activa) return false;
    if (estado === 'Inactivas' && fila.activa) return false;
    if (!termino) return true;

    return [fila.identificador, fila.codigoAnt, fila.origen, fila.destino, fila.ruta].some((campo) =>
      normalizarTexto(campo).includes(termino),
    );
  });
}

/**
 * Calcula el siguiente código de frecuencia autonumérico basándose en las frecuencias existentes.
 * Formato estándar: FR-001, FR-002, ..., FR-010, etc.
 */
export function siguienteCodigoFrecuencia(
  frecuencias: Array<{ identificadorFrecuencia?: string; identificador?: string }>,
  prefijo = 'FR',
): string {
  let maxNumero = 0;
  const regex = new RegExp(`^${prefijo}-(\\d+)$`, 'i');

  for (const f of frecuencias) {
    const id = f.identificadorFrecuencia ?? f.identificador ?? '';
    const match = id.trim().match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNumero) {
        maxNumero = num;
      }
    }
  }

  const siguiente = maxNumero + 1;
  return `${prefijo}-${String(siguiente).padStart(3, '0')}`;
}

