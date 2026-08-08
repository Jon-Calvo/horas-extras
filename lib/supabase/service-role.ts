import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// ⚠️ SOLO para código que corre en el servidor y necesita bypassear RLS a
// propósito: jobs de sistema (reseteo de ranking), Route Handlers que envían
// emails, importación masiva desde Excel ejecutada por un ADMIN ya validado
// en el Route Handler antes de llamar acá. NUNCA importar este archivo desde
// un Client Component ni exponer SUPABASE_SERVICE_ROLE_KEY con el prefijo
// NEXT_PUBLIC_.
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}