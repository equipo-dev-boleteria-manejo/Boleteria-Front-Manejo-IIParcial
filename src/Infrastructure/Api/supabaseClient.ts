import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  'placeholder-anon-key'

if (!import.meta.env.VITE_SUPABASE_URL || (!import.meta.env.VITE_SUPABASE_ANON_KEY && !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY && !import.meta.env.VITE_SUPABASE_KEY)) {
  console.warn('Configuración de Supabase no detectada. Asegúrate de configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (o VITE_SUPABASE_PUBLISHABLE_KEY) en el archivo .env.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Cliente aislado de Supabase Auth para operaciones que no deben mutar
 * la sesión activa del usuario actual en el almacenamiento local (ej. creación administrativa de cuentas).
 */
export const authIsolatedClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'sb-isolated-auth',
  },
})