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

export type FiltrosSolicitudes = {
  area?: string
  sector?: string
  proceso?: string
  estado?: string
  solicitante?: string
  motivo?: string
  desde?: string
  hasta?: string
}

// Reusa exactamente los mismos filtros que ya arma la página de listado —
// exporta lo que el usuario está viendo en pantalla, no "todo". Trae los
// dos niveles (resumen + detalle de equipo) en una sola Server Action para
// que el cliente arme el libro de 2 hojas sin round-trips adicionales.
export async function exportarSolicitudesDetalladoAction(filtros: FiltrosSolicitudes) {
  const supabase = await createClient()

  let query = supabase.from('vista_solicitudes_resumen').select('*').order('fecha_hora_solicitud', { ascending: false })

  if (filtros.area) query = query.eq('area_id', filtros.area)
  if (filtros.sector) query = query.eq('sector_id', filtros.sector)
  if (filtros.proceso) query = query.eq('proceso_id', filtros.proceso)
  if (filtros.estado) query = query.eq('estado_solicitud', filtros.estado)
  if (filtros.solicitante) query = query.eq('solicitante_id', filtros.solicitante)
  if (filtros.motivo) query = query.eq('motivo_id', filtros.motivo)
  if (filtros.desde) query = query.gte('fecha_hora_inicio', filtros.desde)
  if (filtros.hasta) query = query.lte('fecha_hora_fin', filtros.hasta)

  const { data: solicitudes, error: errorSolicitudes } = await query
  if (errorSolicitudes) return { error: errorSolicitudes.message }

  const ids = (solicitudes ?? []).map((s) => s.id)
  if (ids.length === 0) return { solicitudes: [], empleados: [] }

  const { data: empleadosRaw, error: errorEmpleados } = await supabase
    .from('vista_solicitud_empleados_detalle')
    .select('*')
    .in('solicitud_id', ids)

  if (errorEmpleados) return { error: errorEmpleados.message }

  // `vista_solicitud_empleados_detalle` es una vista — no tiene FK propia
  // hacia `solicitudes` que PostgREST pueda usar para un embed automático
  // (`solicitudes!inner(numero)`), así que el número se resuelve acá con
  // un mapa en memoria a partir de lo que ya trajimos en `solicitudes`.
  const numeroPorSolicitudId = new Map((solicitudes ?? []).map((s) => [s.id, s.numero]))
  const empleados = (empleadosRaw ?? []).map((e) => ({ ...e, numero_solicitud: numeroPorSolicitudId.get(e.solicitud_id) ?? '' }))

  return { solicitudes: solicitudes ?? [], empleados }
}
