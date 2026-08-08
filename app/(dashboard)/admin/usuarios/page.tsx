import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { UsuarioRolConNombre } from '@/lib/types/usuarios'

export default async function UsuariosPage() {
  const supabase = await createClient()

  const [{ data: usuarios }, { data: usuarioRoles }] = await Promise.all([
    supabase.from('usuarios').select('id, nombre_completo, email, activo').order('nombre_completo'),
    supabase.from('usuario_roles').select('usuario_id, roles(nombre)'),
  ])

  const rolesPorUsuario = new Map<string, string[]>()
  ;(usuarioRoles as (UsuarioRolConNombre & { usuario_id: string })[] | null ?? []).forEach((ur) => {
    if (!ur.roles) return
    const lista = rolesPorUsuario.get(ur.usuario_id) ?? []
    lista.push(ur.roles.nombre)
    rolesPorUsuario.set(ur.usuario_id, lista)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Usuarios</h1>
        <Link href="/admin/usuarios/nuevo" className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white">
          + Nuevo usuario
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(usuarios ?? []).map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-3 py-2">{u.nombre_completo}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{(rolesPorUsuario.get(u.id) ?? []).join(', ') || '—'}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${u.activo ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-500'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/usuarios/${u.id}`} className="text-xs text-slate-500 underline">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {(usuarios ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  Sin usuarios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}