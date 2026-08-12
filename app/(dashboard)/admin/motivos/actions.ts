'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function guardarMotivo(id: string | null, valores: Record<string, any>) {
  const supabase = await createClient()

  const payload = {
    motivo: valores.motivo,
    tipo: valores.tipo,
    requiere_aprobacion: Boolean(valores.requiere_aprobacion),
    activo: Boolean(valores.activo),
  }

  const { error } = id
    ? await supabase.from('motivos').update(payload).eq('id', id)
    : await supabase.from('motivos').insert(payload)

  revalidatePath('/admin/motivos')
  return { error: error?.message }
}

/**
 * Server Action específica para ImportarExcelGenerico.
 *
 * No usamos una función inline en page.tsx porque Next.js no permite
 * pasar event handlers/funciones arbitrarias desde un Server Component
 * hacia un Client Component.
 */
export async function importarMotivo(valores: Record<string, any>) {
  return guardarMotivo(null, valores)
}