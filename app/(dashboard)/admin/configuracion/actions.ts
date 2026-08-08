'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function actualizarConfiguracionGeneral(valores: {
  diasMaximosAntiguedad: number
  emailsActivos: boolean
  rankingPeriodo: 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL'
  controlIngresoPermiteEliminar: boolean
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('configuracion_general')
    .update({
      dias_maximos_antiguedad: valores.diasMaximosAntiguedad,
      emails_activos: valores.emailsActivos,
      ranking_periodo: valores.rankingPeriodo,
      control_ingreso_permite_eliminar: valores.controlIngresoPermiteEliminar,
    })
    .eq('id', 1)

  revalidatePath('/admin/configuracion')
  return { error: error?.message }
}
