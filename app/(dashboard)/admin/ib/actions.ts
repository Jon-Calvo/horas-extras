'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function guardarIb(id: string | null, valores: Record<string, any>) {
  const supabase = await createClient()

  const rankingInferior = Number(valores.ranking_inferior)
  const rankingSuperior = valores.ranking_superior === '' ? null : Number(valores.ranking_superior)

  if (rankingSuperior !== null && rankingSuperior < rankingInferior) {
    return { error: 'El ranking superior no puede ser menor al inferior' }
  }

  const payload = {
    descripcion: valores.descripcion,
    ranking_inferior: rankingInferior,
    ranking_superior: rankingSuperior,
    activo: Boolean(valores.activo),
  }

  const { error } = id
    ? await supabase.from('ib_configuracion').update(payload).eq('id', id)
    : await supabase.from('ib_configuracion').insert(payload)

  revalidatePath('/admin/ib')

  // El EXCLUDE constraint de 0004 tira un mensaje de Postgres poco amigable
  // ("conflicting key value violates exclusion constraint...") — lo
  // traducimos acá.
  if (error?.message.includes('exclusion constraint')) {
    return { error: 'Ese rango de ranking se superpone con otro IB ya cargado' }
  }

  return { error: error?.message }
}
