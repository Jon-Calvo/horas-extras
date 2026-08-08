import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

// Uso: en Client Components ('use client'), ej. formularios interactivos,
// tablas con TanStack Table, etc. Cada llamada crea un cliente liviano
// atado al JWT del usuario logueado (RLS se aplica automáticamente).
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}