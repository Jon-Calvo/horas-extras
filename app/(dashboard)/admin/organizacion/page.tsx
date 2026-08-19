import { createClient } from '@/lib/supabase/server'
import { OrganizacionMaestro } from './organizacion-maestro'

export default async function OrganizacionPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; sector?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: areas }, { data: sectores }, { data: procesos }] = await Promise.all([
    supabase.from('areas').select('id, nombre, activo').order('nombre'),
    params.area
      ? supabase.from('sectores').select('id, nombre, activo').eq('area_id', params.area).order('nombre')
      : Promise.resolve({ data: [] as { id: string; nombre: string; activo: boolean }[] }),
    params.sector
      ? supabase.from('procesos').select('id, nombre, activo').eq('sector_id', params.sector).order('nombre')
      : Promise.resolve({ data: [] as { id: string; nombre: string; activo: boolean }[] }),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Organización</h1>
        <p className="text-sm text-text-muted">Áreas → Sectores → Procesos. Elegí un área para ver sus sectores, y un sector para ver sus procesos.</p>
      </div>
      <OrganizacionMaestro areas={areas ?? []} sectores={sectores ?? []} procesos={procesos ?? []} />
    </div>
  )
}