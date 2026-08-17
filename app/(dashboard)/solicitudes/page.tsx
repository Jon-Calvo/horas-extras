import { createClient } from '@/lib/supabase/server'
import {
  parseEstadoSolicitud,
} from '@/lib/enums'
import { requireNonNull } from '@/lib/assert'
import { SolicitudesListado } from './solicitudes-listado'
import type { SolicitudRow } from './columns'
import { SolicitudesFiltros } from './solicitudes-filtros'
import { ExportarSolicitudesBoton } from './exportar-solicitudes-boton'

// Filtros implementados:
// área, sector, proceso, estado, solicitante, motivo,
// rango de fechas desde/hasta.
//
// Pendiente para una fase posterior:
// filtro específico por tipo de motivo,
// mes/año como atajos rápidos sobre el rango de fechas.

export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{
    area?: string
    sector?: string
    proceso?: string
    desde?: string
    hasta?: string
    estado?: string
    solicitante?: string
    motivo?: string
  }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // ============================================================
  // Validar estado proveniente de la URL
  // ============================================================

  const estadoFiltro = parseEstadoSolicitud(
    params.estado,
  )

  // Si viene un estado inválido desde la URL, simplemente
  // no aplicamos el filtro.
  //
  // Esto evita enviar valores arbitrarios a Supabase.
  let query = supabase
    .from('vista_solicitudes_resumen')
    .select('*')
    .order('fecha_hora_solicitud', {
      ascending: false,
    })

  if (params.area) {
    query = query.eq(
      'area_id',
      params.area,
    )
  }

  if (params.sector) {
    query = query.eq(
      'sector_id',
      params.sector,
    )
  }

  if (params.proceso) {
    query = query.eq(
      'proceso_id',
      params.proceso,
    )
  }

  if (estadoFiltro) {
    query = query.eq(
      'estado_solicitud',
      estadoFiltro,
    )
  }

  if (params.solicitante) {
    query = query.eq(
      'solicitante_id',
      params.solicitante,
    )
  }

  if (params.motivo) {
    query = query.eq(
      'motivo_id',
      params.motivo,
    )
  }

  if (params.desde) {
    query = query.gte(
      'fecha_hora_inicio',
      params.desde,
    )
  }

  if (params.hasta) {
    query = query.lte(
      'fecha_hora_fin',
      params.hasta,
    )
  }

  // ============================================================
  // Obtener datos
  // ============================================================

  const [
    { data, error },
    { data: areas },
    { data: sectores },
    { data: procesos },
    { data: usuarios },
    { data: motivos },
  ] = await Promise.all([
    query,

    supabase
      .from('areas')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre'),

    supabase
      .from('sectores')
      .select('id, nombre, area_id')
      .eq('activo', true)
      .order('nombre'),

    supabase
      .from('procesos')
      .select('id, nombre, sector_id')
      .eq('activo', true)
      .order('nombre'),

    supabase
      .from('usuarios')
      .select('id, nombre_completo')
      .eq('activo', true)
      .order('nombre_completo'),

    supabase
      .from('motivos')
      .select('id, motivo')
      .eq('activo', true)
      .order('motivo'),
  ])

  if (error) {
    return (
      <p className="text-red-600">
        Error cargando solicitudes: {error.message}
      </p>
    )
  }

  // ============================================================
  // Transformar filas de Supabase a filas de UI
  // ============================================================

  const rows: SolicitudRow[] = (
    data ?? []
  ).map((r) => {

    const id = requireNonNull(
      r.id,
      'id',
    )

    const numero = requireNonNull(
      r.numero,
      'numero',
    )

    const estadoSolicitud =
      parseEstadoSolicitud(
        r.estado_solicitud,
      )

    if (!estadoSolicitud) {
      throw new Error(
        `Estado de solicitud inválido o NULL para la solicitud ${id}`,
      )
    }

    return {
      id,
      numero,
      estadoSolicitud,

      solicitanteNombre:
        requireNonNull(
          r.solicitante_nombre,
          'solicitante_nombre',
        ),

      areaNombre:
        requireNonNull(
          r.area_nombre,
          'area_nombre',
        ),

      sectorNombre:
        requireNonNull(
          r.sector_nombre,
          'sector_nombre',
        ),

      procesoNombre:
        r.proceso_nombre,

      motivoNombre:
        requireNonNull(
          r.motivo_nombre,
          'motivo_nombre',
        ),

      fechaHoraInicio:
        requireNonNull(
          r.fecha_hora_inicio,
          'fecha_hora_inicio',
        ),

      fechaHoraFin:
        requireNonNull(
          r.fecha_hora_fin,
          'fecha_hora_fin',
        ),

      cantidadEmpleados:
        Number(r.cantidad_empleados),

      totalHorasSolicitud:
        Number(r.total_horas_solicitud),

      totalImporteSolicitud:
        Number(r.total_importe_solicitud),

      moneda:
        r.moneda,
    }
  })

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between">

        <h1 className="text-lg font-semibold">
          Solicitudes
        </h1>

        <ExportarSolicitudesBoton
          filtros={params}
        />

      </div>

      <SolicitudesFiltros
        opciones={{
          areas: areas ?? [],

          sectores: (sectores ?? []).map(
            (s) => ({
              id: s.id,
              nombre: s.nombre,
              areaId: s.area_id,
            }),
          ),

          procesos: (procesos ?? []).map(
            (p) => ({
              id: p.id,
              nombre: p.nombre,
              sectorId: p.sector_id,
            }),
          ),

          solicitantes: (usuarios ?? []).map(
            (u) => ({
              id: u.id,
              nombre: u.nombre_completo,
            }),
          ),

          motivos: motivos ?? [],
        }}
      />

      <SolicitudesListado
        rows={rows}
      />

    </div>
  )
}