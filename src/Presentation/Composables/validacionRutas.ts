/**
 * validacionRutas.ts - Reglas de validación de los formularios de rutas, hojas de ruta y operación del chofer
 *
 * Funciones puras: devuelven el mensaje de error o una cadena vacía cuando el valor es válido.
 */

export const MAX_OBSERVACION = 200;
export const MIN_OBSERVACION_OBLIGATORIA = 5;
export const MAX_TIEMPO_VIAJE_MINUTOS = 1440;
export const MAX_CODIGO_BOLETO = 100;

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Un select obligatorio: vacío o sin elegir. */
export function validarSeleccion(valor: number | string | '', mensaje: string): string {
  return valor === '' || valor === null || valor === undefined || Number(valor) <= 0 ? mensaje : '';
}

function esFechaValida(fecha: string): boolean {
  if (!FORMATO_FECHA.test(fecha)) return false;
  const [anio, mes, dia] = fecha.split('-').map(Number) as [number, number, number];
  const construida = new Date(anio, mes - 1, dia);
  return construida.getFullYear() === anio && construida.getMonth() === mes - 1 && construida.getDate() === dia;
}

/** La fecha del viaje: obligatoria, válida y no anterior a hoy. */
export function validarFechaRuta(fecha: string, hoy: string): string {
  const texto = (fecha ?? '').trim();
  if (!texto) return 'La fecha del viaje es obligatoria';
  if (!esFechaValida(texto)) return 'La fecha no es válida';
  if (texto < hoy) return 'La fecha no puede ser anterior a hoy';
  return '';
}

export function validarFechaConsulta(fecha: string): string {
  const texto = (fecha ?? '').trim();
  if (!texto) return 'La fecha de operación es obligatoria';
  if (!esFechaValida(texto)) return 'La fecha no es válida';
  return '';
}

export function validarDiaOperativo(operativo: boolean): string {
  return operativo ? '' : 'La frecuencia seleccionada no opera en la fecha elegida';
}

/** Tiempo estimado de viaje: opcional; si se indica, un entero de minutos entre 1 y 24 horas. */
export function validarTiempoViaje(valor: number | string | ''): string {
  const texto = String(valor ?? '').trim();
  if (!texto) return '';
  const numero = Number(texto);
  if (!Number.isInteger(numero) || numero < 1 || numero > MAX_TIEMPO_VIAJE_MINUTOS) {
    return `Debe ser un número entero de minutos entre 1 y ${MAX_TIEMPO_VIAJE_MINUTOS}`;
  }
  return '';
}

export function validarObservacionOpcional(texto: string): string {
  return (texto ?? '').trim().length > MAX_OBSERVACION
    ? `No puede superar ${MAX_OBSERVACION} caracteres`
    : '';
}

/** Observación del conductor (cierre o incidente): obligatoria y con algo de detalle. */
export function validarObservacionObligatoria(texto: string): string {
  const valor = (texto ?? '').trim();
  if (!valor) return 'La observación es obligatoria';
  if (valor.length < MIN_OBSERVACION_OBLIGATORIA) {
    return `Describe lo ocurrido con al menos ${MIN_OBSERVACION_OBLIGATORIA} caracteres`;
  }
  if (valor.length > MAX_OBSERVACION) return `No puede superar ${MAX_OBSERVACION} caracteres`;
  return '';
}

/** Código de boleto ingresado a mano: obligatorio, sin espacios y de largo razonable. */
export function validarCodigoBoleto(codigo: string): string {
  const valor = (codigo ?? '').trim();
  if (!valor) return 'El código del boleto es obligatorio';
  if (/\s/.test(valor)) return 'El código no puede contener espacios';
  if (valor.length > MAX_CODIGO_BOLETO) return `No puede superar ${MAX_CODIGO_BOLETO} caracteres`;
  return '';
}
