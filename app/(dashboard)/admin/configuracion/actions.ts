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

  if (!error) revalidatePath('/admin/configuracion')
  return { error: error?.message }
}

// El job automático corre todos los días vía pg_cron (0034) y decide solo
// si corresponde resetear según el corte de calendario configurado. Esto
// es para pruebas o para corregir un corte que no llegó a correr — resetea
// SIN importar la fecha.
export async function forzarReseteoRanking() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('rpc_forzar_reseteo_ranking')

  if (!error) revalidatePath('/admin/configuracion')
  return { error: error?.message, cantidadReseteados: data as number | undefined }
}
