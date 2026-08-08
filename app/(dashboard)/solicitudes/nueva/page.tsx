import { createClient } from '@/lib/supabase/server'
import { SolicitudForm } from './solicitud-form'

export default async function NuevaSolicitudPage() {
  const supabase = await createClient()

  const [{ data: areas }, { data: sectores }, { data: procesos }, { data: motivos }] = await Promise.all([
    supabase.from('areas').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('sectores').select('id, nombre, area_id').eq('activo', true).order('nombre'),
    supabase.from('procesos').select('id, nombre, sector_id').eq('activo', true).order('nombre'),
    supabase.from('motivos').select('id, motivo').eq('activo', true).order('motivo'),
  ])

  return (
    <SolicitudForm
      opciones={{
        areas: areas ?? [],
        sectores: (sectores ?? []).map((s) => ({ id: s.id, nombre: s.nombre, areaId: s.area_id })),
        procesos: (procesos ?? []).map((p) => ({ id: p.id, nombre: p.nombre, sectorId: p.sector_id })),
        motivos: motivos ?? [],
      }}
    />
  )
}