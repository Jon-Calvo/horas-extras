'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  parseEstadoSolicitud,
} from '@/lib/enums'
import { solicitudesRpc } from '@/lib/supabase/rpc'

// ============================================================
// Aprobación masiva
// ============================================================
//
// Reutiliza rpc_aprobacion_masiva (0016).
//
// Cada solicitud del lote se valida individualmente contra el
// scope de aprobación del usuario.
//
// El RPC es atómico:
// si una sola solicitud del lote no está autorizada o no está
// en estado PENDIENTE/ABIERTA, se aborta todo el lote.
// ============================================================

export async function aprobacionMasivaListadoAction(
  solicitudIds: string[],
  accion: 'APROBAR' | 'RECHAZAR',
) {
  const supabase = await createClient()

  const {
    error,
  } = await solicitudesRpc(
    supabase,
  ).aprobacionMasiva(
    solicitudIds,
    accion,
  )

  if (!error) {
    revalidatePath('/solicitudes')
  }

  return {
    error: error?.message,
  }
}

// ============================================================
// Filtros de solicitudes
// ============================================================

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

// ============================================================
// Exportación detallada
// ============================================================
//
// Reutiliza exactamente los filtros del listado.
// Exporta lo que el usuario está viendo.
//
// Devuelve:
// - solicitudes: resumen
// - empleados: detalle de empleados
// ============================================================

export async function exportarSolicitudesDetalladoAction(
  filtros: FiltrosSolicitudes,
) {
  const supabase = await createClient()

  // ------------------------------------------------------------
  // Validar estado
  // ------------------------------------------------------------

  const estadoFiltro = parseEstadoSolicitud(
    filtros.estado,
  )

  // ------------------------------------------------------------
  // Consulta principal
  // ------------------------------------------------------------

  let query = supabase
    .from('vista_solicitudes_resumen')
    .select('*')
    .order(
      'fecha_hora_solicitud',
      {
        ascending: false,
      },
    )

  if (filtros.area) {
    query = query.eq(
      'area_id',
      filtros.area,
    )
  }

  if (filtros.sector) {
    query = query.eq(
      'sector_id',
      filtros.sector,
    )
  }

  if (filtros.proceso) {
    query = query.eq(
      'proceso_id',
      filtros.proceso,
    )
  }

  if (estadoFiltro) {
    query = query.eq(
      'estado_solicitud',
      estadoFiltro,
    )
  }

  if (filtros.solicitante) {
    query = query.eq(
      'solicitante_id',
      filtros.solicitante,
    )
  }

  if (filtros.motivo) {
    query = query.eq(
      'motivo_id',
      filtros.motivo,
    )
  }

  if (filtros.desde) {
    query = query.gte(
      'fecha_hora_inicio',
      filtros.desde,
    )
  }

  if (filtros.hasta) {
    query = query.lte(
      'fecha_hora_fin',
      filtros.hasta,
    )
  }

  // ------------------------------------------------------------
  // Solicitudes
  // ------------------------------------------------------------

  const {
    data: solicitudes,
    error: errorSolicitudes,
  } = await query

  if (errorSolicitudes) {
    return {
      error: errorSolicitudes.message,
    }
  }

  const ids = (solicitudes ?? [])
    .map((s) => s.id)
    .filter((id): id is string => id !== null)

  if (ids.length === 0) {
    return {
      solicitudes: [],
      empleados: [],
    }
  }

  // ------------------------------------------------------------
  // Empleados
  // ------------------------------------------------------------

  const {
    data: empleadosRaw,
    error: errorEmpleados,
  } = await supabase
    .from('vista_solicitud_empleados_detalle')
    .select('*')
    .in(
      'solicitud_id',
      ids,
    )

  if (errorEmpleados) {
    return {
      error: errorEmpleados.message,
    }
  }

  // ------------------------------------------------------------
  // Resolver número de solicitud
  // ------------------------------------------------------------
  //
  // `vista_solicitud_empleados_detalle` es una vista y no tiene
  // FK propia que PostgREST pueda utilizar para un embed
  // automático.
  //
  // Por eso armamos un mapa en memoria.
  // ------------------------------------------------------------

  const numeroPorSolicitudId =
    new Map(
      (solicitudes ?? [])
        .filter(
          (s): s is typeof s & { id: string } =>
            s.id !== null,
        )
        .map(
          (s) => [
            s.id,
            s.numero ?? '',
          ],
        ),
    )

  const empleados = (
    empleadosRaw ?? []
  ).map(
    (e) => ({
      ...e,

      numero_solicitud:
        numeroPorSolicitudId.get(
          e.solicitud_id ?? '',
        ) ?? '',
    }),
  )

  return {
    solicitudes:
      solicitudes ?? [],

    empleados,
  }
}