/**
 * configuracion.ts - Comprobaciones de configuración del entorno usadas por
 * las vistas para degradar con mensajes claros cuando faltan credenciales.
 */

const urlSupabase = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const llaveSupabase = String(
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_KEY ??
    '',
).trim()

export const supabaseConfigurado = Boolean(urlSupabase && llaveSupabase)

export const MENSAJE_SUPABASE_NO_CONFIGURADO =
  'Supabase no está configurado. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env para consultar rutas, asientos y ventas reales.'

export const MENSAJE_SESION_REQUERIDA =
  'No se pudo identificar al usuario autenticado. Vuelve a iniciar sesión para continuar.'

export function obtenerMensajeError(error: unknown, respaldo: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  if (typeof error === 'string' && error.trim()) {
    return error
  }
  return respaldo
}
