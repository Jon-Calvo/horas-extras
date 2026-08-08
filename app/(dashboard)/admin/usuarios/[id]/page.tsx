import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UsuarioForm } from '../usuario-form'
import { actualizarUsuario } from '../actions'
import { AccionesCuenta } from './acciones-cuenta'
import { extraerNombresDeRoles, type UsuarioRolConNombre } from '@/lib/types/usuarios'

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: usuario }, { data: permisos }, { data: rolesUsuario }, { data: areas }, { data: sectores }, { data: procesos }] =
    await Promise.all([
      supabase.from('usuarios').select('*').eq('id', id).maybeSingle(),
      supabase.from('usuario_permisos').select('*').eq('usuario_id', id).maybeSingle(),
      supabase.from('usuario_roles').select('roles(nombre)').eq('usuario_id', id),
      supabase.from('areas').select('id, nombre').eq('activo', true).order('nombre'),
      supabase.from('sectores').select('id, nombre, area_id').eq('activo', true).order('nombre'),
      supabase.from('procesos').select('id, nombre, sector_id').eq('activo', true).order('nombre'),
    ])

  if (!usuario) notFound()

  const rolesActuales = extraerNombresDeRoles((rolesUsuario as UsuarioRolConNombre[] | null) ?? [])

  // `.bind(null, id)` pre-aplica el primer argumento de actualizarUsuario
  // (id, prevState, formData) → queda con la firma (prevState, formData)
  // que espera useActionState/<form action>. Esto SIGUE siendo una
  // referencia válida de Server Action (a diferencia de envolverla en una
  // arrow function nueva) — es el patrón soportado por Next.js para
  // "pre-cargar" datos en una acción antes de pasarla a un Client Component.
  const actualizarUsuarioConId = actualizarUsuario.bind(null, id)

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">{usuario.nombre_completo}</h1>

      <UsuarioForm
        modo="editar"
        action={actualizarUsuarioConId}
        opciones={{
          areas: areas ?? [],
          sectores: (sectores ?? []).map((s) => ({ id: s.id, nombre: s.nombre, areaId: s.area_id })),
          procesos: (procesos ?? []).map((p) => ({ id: p.id, nombre: p.nombre, sectorId: p.sector_id })),
        }}
        valoresIniciales={{
          nombreCompleto: usuario.nombre_completo,
          email: usuario.email,
          areaId: usuario.area_id ?? '',
          sectorId: usuario.sector_id ?? '',
          procesoId: usuario.proceso_id ?? '',
          roles: rolesActuales,
          permisos: {
            visibilidadNivel: permisos?.visibilidad_nivel ?? 'NADA',
            aprobacionNivel: permisos?.aprobacion_nivel ?? 'NADA',
            modificacionNivel: permisos?.modificacion_nivel ?? 'NADA',
            reaperturaNivel: permisos?.reapertura_nivel ?? 'NADA',
            controlIngreso: permisos?.control_ingreso ?? false,
          },
        }}
      />

      <AccionesCuenta usuarioId={id} email={usuario.email} activo={usuario.activo} />
    </div>
  )
}
