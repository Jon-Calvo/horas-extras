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