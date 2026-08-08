import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/empleados/buscar?q=<texto>&areaId=&sectorId=&procesoId=&nombre=&ibId=&limit=30
//
// `q` es la búsqueda libre del autocomplete individual (legajo o nombre).
// `nombre` es un filtro explícito solo por nombre (usado en el panel de
// carga masiva, junto con los filtros de área/sector/proceso/IB).
// Usa el cliente normal (no service_role): la RLS de `empleados` (scope de
// visibilidad) se aplica sola.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const nombre = searchParams.get('nombre')?.trim()
  const areaId = searchParams.get('areaId')
  const sectorId = searchParams.get('sectorId')
  const procesoId = searchParams.get('procesoId')
  const ibId = searchParams.get('ibId')
  const limit = Math.min(Number(searchParams.get('limit') ?? 30), 100)

  const supabase = await createClient()

  let query = supabase
    .from('empleados')
    .select('id, legajo, nombre_completo, area_id, sector_id, proceso_id, ib_id, estado')
    .eq('estado', 'ACTIVO')
    .order('nombre_completo')
    .limit(limit)

  if (areaId) query = query.eq('area_id', areaId)
  if (sectorId) query = query.eq('sector_id', sectorId)
  if (procesoId) query = query.eq('proceso_id', procesoId)
  if (ibId) query = query.eq('ib_id', ibId)

  if (q) {
    // Sacamos caracteres que romperían el filtro .or() de PostgREST
    const seguro = q.replace(/[,()%]/g, '')
    query = query.or(`legajo.ilike.%${seguro}%,nombre_completo.ilike.%${seguro}%`)
  } else if (nombre) {
    const seguro = nombre.replace(/[,()%]/g, '')
    query = query.ilike('nombre_completo', `%${seguro}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ data })
}
