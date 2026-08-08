import { createClient } from '@/lib/supabase/server'
import { SolicitudesListado } from './solicitudes-listado'
import type { SolicitudRow } from './columns'
import { SolicitudesFiltros } from './solicitudes-filtros'

// Filtros del enunciado original: mes, año, fecha, rango de fechas, área,
// sector, proceso, motivo, tipo de motivo, solicitante. Implementados:
// área, sector, proceso, estado, solicitante, motivo, rango de fechas
// (desde/hasta). Queda para más adelante: filtro por tipo de motivo
// específicamente, y mes/año como atajos rápidos sobre el rango de fechas.
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

  let query = supabase
    .from('vista_solicitudes_resumen')
    .select('*')
    .order('fecha_hora_solicitud', { ascending: false })

  if (params.area) query = query.eq('area_id', params.area)
  if (params.sector) query = query.eq('sector_id', params.sector)
  if (params.proceso) query = query.eq('proceso_id', params.proceso)
  if (params.estado) query = query.eq('estado_solicitud', params.estado)
  if (params.solicitante) query = query.eq('solicitante_id', params.solicitante)
  if (params.motivo) query = query.eq('motivo_id', params.motivo)
  if (params.desde) query = query.gte('fecha_hora_inicio', params.desde)
  if (params.hasta) query = query.lte('fecha_hora_fin', params.hasta)

  const [{ data, error }, { data: areas }, { data: sectores }, { data: procesos }, { data: usuarios }, { data: motivos }] =
    await Promise.all([
      query,
      supabase.from('areas').select('id, nombre').eq('activo', true).order('nombre'),
      supabase.from('sectores').select('id, nombre, area_id').eq('activo', true).order('nombre'),
      supabase.from('procesos').select('id, nombre, sector_id').eq('activo', true).order('nombre'),
      supabase.from('usuarios').select('id, nombre_completo').eq('activo', true).order('nombre_completo'),
      supabase.from('motivos').select('id, motivo').eq('activo', true).order('motivo'),
    ])

  if (error) {
    return <p className="text-red-600">Error cargando solicitudes: {error.message}</p>
  }

  const rows: SolicitudRow[] = (data ?? []).map((r) => ({
    id: r.id,
    numero: r.numero,
    estadoSolicitud: r.estado_solicitud,
    solicitanteNombre: r.solicitante_nombre,
    areaNombre: r.area_nombre,
    sectorNombre: r.sector_nombre,
    procesoNombre: r.proceso_nombre,
    motivoNombre: r.motivo_nombre,
    fechaHoraInicio: r.fecha_hora_inicio,
    fechaHoraFin: r.fecha_hora_fin,
    cantidadEmpleados: r.cantidad_empleados,
    totalHorasSolicitud: Number(r.total_horas_solicitud),
    totalImporteSolicitud: Number(r.total_importe_solicitud),
    moneda: r.moneda,
  }))

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Solicitudes</h1>

      <SolicitudesFiltros
        opciones={{
          areas: areas ?? [],
          sectores: (sectores ?? []).map((s) => ({ id: s.id, nombre: s.nombre, areaId: s.area_id })),
          procesos: (procesos ?? []).map((p) => ({ id: p.id, nombre: p.nombre, sectorId: p.sector_id })),
          solicitantes: (usuarios ?? []).map((u) => ({ id: u.id, nombre: u.nombre_completo })),
          motivos: motivos ?? [],
        }}
      />

      <SolicitudesListado rows={rows} />
    </div>
  )
}
