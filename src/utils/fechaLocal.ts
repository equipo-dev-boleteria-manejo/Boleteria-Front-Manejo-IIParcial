/**
 * Fecha local en formato YYYY-MM-DD.
 *
 * No usar toISOString(): devuelve la fecha en UTC y en Ecuador (UTC-5) después de las 19:00 ya sería el día
 * siguiente. Se usa tanto en la capa de aplicación (reglas por fecha) como en la de presentación.
 */
export function fechaLocalISO(fecha: Date = new Date()): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Suma (o resta) días a una fecha YYYY-MM-DD respetando fines de mes y de año. */
export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number) as [number, number, number];
  return fechaLocalISO(new Date(anio, mes - 1, dia + dias));
}
