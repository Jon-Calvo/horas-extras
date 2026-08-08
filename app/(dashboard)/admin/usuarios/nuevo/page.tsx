import { createClient } from '@/lib/supabase/server'
import { UsuarioForm } from '../usuario-form'
import { crearUsuario } from '../actions'

export default async function NuevoUsuarioPage() {
  const supabase = await createClient()

  const [{ data: areas }, { data: sectores }, { data: procesos }] = await Promise.all([
    supabase.from('areas').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('sectores').select('id, nombre, area_id').eq('activo', true).order('nombre'),
    supabase.from('procesos').select('id, nombre, sector_id').eq('activo', true).order('nombre'),
  ])

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Nuevo usuario</h1>
      {/* `action={crearUsuario}` — la referencia cruda de la Server Action,
          sin envolverla. Así es como se pasa correctamente de Server a
          Client Component. */}
      <UsuarioForm
        modo="crear"
        action={crearUsuario}
        opciones={{
          areas: areas ?? [],
          sectores: (sectores ?? []).map((s) => ({ id: s.id, nombre: s.nombre, areaId: s.area_id })),
          procesos: (procesos ?? []).map((p) => ({ id: p.id, nombre: p.nombre, sectorId: p.sector_id })),
        }}
        valoresIniciales={{
          nombreCompleto: '',
          email: '',
          areaId: '',
          sectorId: '',
          procesoId: '',
          roles: [],
          permisos: {
            visibilidadNivel: 'NADA',
            aprobacionNivel: 'NADA',
            modificacionNivel: 'NADA',
            reaperturaNivel: 'NADA',
            controlIngreso: false,
          },
        }}
      />
    </div>
  )
}
