/**
 * validacionFrecuencia.ts - Reglas de validación de los formularios de frecuencias y paradas
 *
 * Funciones puras: devuelven el mensaje de error o una cadena vacía cuando el valor es válido.
 * Los límites de longitud coinciden con las columnas de la base de datos (supabase/schema.sql).
 */

export const MAX_CIUDAD = 100;
export const MAX_IDENTIFICADOR = 50;
export const MAX_CODIGO_ANT = 50;
export const MAX_RESOLUCION_ANT = 100;
export const MAX_MINUTOS_PARADA = 1440;
export const MAX_COSTO_PARADA = 1000;

const FORMATO_CIUDAD = /^\p{L}[\p{L}\s.'’-]*$/u;
const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const FORMATO_IDENTIFICADOR = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Una ciudad: obligatoria, solo letras (con tildes), espacios, puntos y guiones. */
export function validarCiudad(valor: string, etiqueta: string): string {
  const texto = (valor ?? '').trim();
  if (!texto) return `${etiqueta} es obligatoria`;
  if (texto.length > MAX_CIUDAD) return `No puede superar ${MAX_CIUDAD} caracteres`;
  if (!FORMATO_CIUDAD.test(texto)) return 'Solo se permiten letras, espacios, puntos y guiones';
  return '';
}

export function validarOrigen(valor: string): string {
  return validarCiudad(valor, 'La ciudad de origen');
}

export function validarDestino(valor: string, origen: string): string {
  const error = validarCiudad(valor, 'La ciudad de destino');
  if (error) return error;
  if (origen.trim() && normalizar(valor) === normalizar(origen)) {
    return 'El destino debe ser distinto del origen';
  }
  return '';
}

export function validarHora(valor: string): string {
  const texto = (valor ?? '').trim();
  if (!texto) return 'La hora de salida es obligatoria';
  if (!FORMATO_HORA.test(texto)) return 'Formato de hora inválido (HH:mm, por ejemplo 08:30)';
  return '';
}

export function validarIdentificador(valor: string): string {
  const texto = (valor ?? '').trim();
  if (!texto) return 'El identificador es obligatorio';
  if (texto.length > MAX_IDENTIFICADOR) return `No puede superar ${MAX_IDENTIFICADOR} caracteres`;
  if (!FORMATO_IDENTIFICADOR.test(texto)) {
    return 'Solo letras, números, guiones, puntos y barras (ej. FR-001)';
  }
  return '';
}

/** Campo de texto opcional con longitud máxima. */
export function validarTextoOpcional(valor: string, etiqueta: string, maximo: number): string {
  if ((valor ?? '').trim().length > maximo) return `${etiqueta} no puede superar ${maximo} caracteres`;
  return '';
}

export function validarDias(dias: readonly string[]): string {
  return dias.length === 0 ? 'Selecciona al menos un día de operación' : '';
}

/** Aviso (no es un error): guardar como directa una frecuencia con paradas las elimina. */
export function avisoDirecto(esDirecto: boolean, totalParadas: number): string {
  if (!esDirecto || totalParadas <= 0) return '';
  const paradas = totalParadas === 1 ? 'su parada intermedia' : `sus ${totalParadas} paradas intermedias`;
  return `Al guardar se eliminarán ${paradas}, porque una frecuencia directa no las lleva.`;
}

export function validarCooperativa(valor: string | number): string {
  const texto = String(valor ?? '').trim();
  const numero = Number(texto);
  if (!texto || !Number.isInteger(numero) || numero < 1) {
    return 'Indica una cooperativa válida (número entero mayor a 0)';
  }
  return '';
}

// ---------- Paradas intermedias ----------

/** Una parada: ciudad válida y distinta del origen y del destino de la frecuencia. */
export function validarCiudadParada(valor: string, extremos: readonly string[]): string {
  const error = validarCiudad(valor, 'La ciudad de la parada');
  if (error) return error;
  if (extremos.some((extremo) => extremo.trim() && normalizar(extremo) === normalizar(valor))) {
    return 'La parada no puede ser el origen ni el destino de la frecuencia';
  }
  return '';
}

export function validarOrden(valor: string | number, ordenesExistentes: readonly number[]): string {
  const texto = String(valor ?? '').trim();
  if (!texto) return 'El orden es obligatorio';
  const numero = Number(texto);
  if (!Number.isInteger(numero) || numero < 1) return 'Debe ser un número entero mayor a 0';
  if (ordenesExistentes.includes(numero)) return `Ya existe una parada con el orden ${numero}`;
  return '';
}

export function validarMinutosParada(valor: string | number): string {
  const texto = String(valor ?? '').trim();
  if (!texto) return 'Los minutos desde el origen son obligatorios';
  const numero = Number(texto);
  if (!Number.isInteger(numero) || numero < 0) return 'Debe ser un número entero de 0 o más';
  if (numero > MAX_MINUTOS_PARADA) return `No puede superar ${MAX_MINUTOS_PARADA} minutos (24 horas)`;
  return '';
}

/** El costo es opcional: vacío equivale a 0. */
export function validarCostoParada(valor: string | number): string {
  const texto = String(valor ?? '').trim();
  if (!texto) return '';
  const numero = Number(texto);
  if (!Number.isFinite(numero) || numero < 0) return 'Debe ser un monto de 0 o más';
  if (Math.round(numero * 100) / 100 !== numero) return 'Máximo 2 decimales';
  if (numero > MAX_COSTO_PARADA) return `No puede superar $${MAX_COSTO_PARADA}`;
  return '';
}
