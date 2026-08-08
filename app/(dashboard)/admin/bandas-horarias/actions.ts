'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function guardarBandaHoraria(id: string | null, valores: Record<string, any>) {
  const supabase = await createClient()

  const payload = {
    descripcion: valores.descripcion,
    dia_inicio: Number(valores.dia_inicio),
    dia_fin: Number(valores.dia_fin),
    hora_inicio: valores.hora_inicio,
    hora_fin: valores.hora_fin,
    factor_valor_hora: Number(valores.factor_valor_hora),
    factor_feriado: Number(valores.factor_feriado),
    activo: Boolean(valores.activo),
  }

  const { error } = id
    ? await supabase.from('bandas_horarias').update(payload).eq('id', id)
    : await supabase.from('bandas_horarias').insert(payload)

  revalidatePath('/admin/bandas-horarias')
  return { error: error?.message }
}
