'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { maestrosRpc } from '@/lib/supabase/rpc'

export async function guardarCategoriaTipo(id: string | null, valores: Record<string, any>) {
  const supabase = await createClient()

  const payload = {
    codigo: valores.codigo,
    descripcion: valores.descripcion,
    activo: Boolean(valores.activo),
  }

  const { error } = id
    ? await supabase.from('categoria_tipos').update(payload).eq('id', id)
    : await supabase.from('categoria_tipos').insert(payload)

  revalidatePath('/admin/categorias')
  return { error: error?.message }
}

export async function actualizarValorCategoria(args: {
  categoriaTipoId: string
  valorHora: number
  moneda: string
  vigenciaDesde: string
}) {
  const supabase = await createClient()
  const { error } = await maestrosRpc(supabase).actualizarValorCategoria(args)

  revalidatePath('/admin/categorias')
  revalidatePath(`/admin/categorias/${args.categoriaTipoId}`)
  return { error: error?.message }
}
