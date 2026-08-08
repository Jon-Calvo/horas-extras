import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const SECCIONES = [
  { href: '/admin/usuarios', label: 'Usuarios' },
  { href: '/admin/organizacion', label: 'Organización' },
  { href: '/admin/categorias', label: 'Categorías' },
  { href: '/admin/bandas-horarias', label: 'Bandas horarias' },
  { href: '/admin/motivos', label: 'Motivos' },
  { href: '/admin/feriados', label: 'Feriados' },
  { href: '/admin/ib', label: 'IB' },
  { href: '/admin/configuracion', label: 'Configuración general' },
]

// Guard a nivel de layout: aunque la RLS ya bloquea cualquier escritura no-
// admin (defensa real), acá evitamos que un usuario sin permisos vea
// siquiera las pantallas — mejor UX, no reemplaza la RLS.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: esAdmin } = await supabase.rpc('fn_es_admin')

  if (!esAdmin) {
    return (
      <div className="rounded-lg border bg-white p-6 text-sm text-slate-600">
        No tenés permisos de administrador para acceder a esta sección.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2 border-b pb-3">
        {SECCIONES.map((s) => (
          <Link key={s.href} href={s.href} className="rounded px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
            {s.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}
