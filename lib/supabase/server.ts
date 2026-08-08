import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

// Uso: en Server Components, Server Actions y Route Handlers (app/api/*).
// Lee/escribe las cookies de sesión de Supabase Auth para que el JWT viaje
// en cada request y RLS sepa quién está preguntando.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Se puede ignorar si se llama desde un Server Component (no
            // desde un Route Handler o Server Action) — el middleware ya
            // refresca la sesión en esos casos.
          }
        },
      },
    }
  )
}
