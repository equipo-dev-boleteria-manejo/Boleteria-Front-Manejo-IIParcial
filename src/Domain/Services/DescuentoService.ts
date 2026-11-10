/**
 * Servicio de Dominio: lógica de cálculo de descuentos por tipo de pasajero.
 *
 * Contiene las reglas oficiales de descuento del sistema de transporte ecuatoriano:
 * - 30 % para menores de edad (< 18 años)
 * - 50 % para personas con discapacidad
 * - 50 % para adultos mayores (≥ 65 años)
 *
 * Extraído de EstadosSistema.ts para respetar el Principio de Responsabilidad Única (SRP):
 * ese archivo solo debe contener enumeraciones y tipos de estado del dominio.
 */

export const DESCUENTO_MENOR = 0.3;
export const DESCUENTO_DISCAPACIDAD = 0.5;
export const DESCUENTO_TERCERA_EDAD = 0.5;

export type CalculoDescuento = {
  esMenor: boolean;
  esDiscapacitado: boolean;
  esTerceraEdad: boolean;
  descuentoAplicado: number;
  precioFinal: number;
};

/**
 * Calcula la edad en años completos a partir de una fecha de nacimiento ISO (YYYY-MM-DD).
 * Devuelve -1 si la fecha es inválida.
 */
export function calcularEdad(fechaNacimiento: string): number {
  const fecha = new Date(fechaNacimiento);
  if (Number.isNaN(fecha.getTime())) return -1;
  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getFullYear();
  const m = hoy.getMonth() - fecha.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) edad--;
  return edad;
}

/**
 * Aplica las reglas de descuento y devuelve el precio final con el porcentaje
 * de descuento máximo que corresponde al pasajero.
 */
export function calcularDescuentoBoleto(
  fechaNacimiento: string,
  tieneDiscapacidad: boolean,
  precioBase: number,
): CalculoDescuento {
  const edad = calcularEdad(fechaNacimiento);
  const esMenor = edad >= 0 && edad < 18;
  const esTerceraEdad = edad >= 65;
  const esDiscapacitado = !!tieneDiscapacidad;

  const candidatos: number[] = [0];
  if (esMenor) candidatos.push(DESCUENTO_MENOR);
  if (esDiscapacitado) candidatos.push(DESCUENTO_DISCAPACIDAD);
  if (esTerceraEdad) candidatos.push(DESCUENTO_TERCERA_EDAD);

  const descuentoAplicado = Math.max(...candidatos);
  const precioFinal = Number((precioBase * (1 - descuentoAplicado)).toFixed(2));
  return { esMenor, esDiscapacitado, esTerceraEdad, descuentoAplicado, precioFinal };
}
