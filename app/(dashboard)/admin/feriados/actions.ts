'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function guardarFeriado(id: string | null, valores: Record<string, any>) {
  const supabase = await createClient()

  const payload = { fecha: valores.fecha, descripcion: valores.descripcion }

  const { error } = id
    ? await supabase.from('feriados').update(payload).eq('id', id)
    : await supabase.from('feriados').insert(payload)

  revalidatePath('/admin/feriados')
  return { error: error?.message }
}

// Feriados es la única maestra con borrado físico: no tiene FK desde ninguna
// tabla transaccional (solo se consulta por fecha en el motor de cálculo),
// así que no hay riesgo de romper referencias.
export async function eliminarFeriado(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('feriados').delete().eq('id', id)
  revalidatePath('/admin/feriados')
  return { error: error?.message }
}
