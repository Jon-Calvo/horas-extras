'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { solicitudesRpc } from '@/lib/supabase/rpc'

// Reutiliza rpc_aprobacion_masiva (0016) — cada solicitud del lote se valida
// individualmente contra el scope de aprobación del usuario. Es atómico:
// si una sola solicitud del lote no está autorizada o no está en estado
// PENDIENTE/ABIERTA, se aborta todo el lote (comportamiento del RPC, no
// decisión de esta capa) — se lo advierte en la UI.
export async function aprobacionMasivaListadoAction(solicitudIds: string[], accion: 'APROBAR' | 'RECHAZAR') {
  const supabase = await createClient()
  const { error } = await solicitudesRpc(supabase).aprobacionMasiva(solicitudIds, accion)

  if (!error) {
    revalidatePath('/solicitudes')
  }

  return { error: error?.message }
}