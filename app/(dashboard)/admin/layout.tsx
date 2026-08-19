import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const SECCIONES = [
  { href: '/admin/usuarios', label: 'Usuarios' },
  { href: '/admin/empleados', label: 'Empleados' },
  { href: '/admin/organizacion', label: 'Organización' },
  { href: '/admin/apariencia', label: 'Apariencia' },
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
      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-text-muted">
        No tenés permisos de administrador para acceder a esta sección.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2 border-b border-b-border pb-3">
        {SECCIONES.map((s) => (
          <Link key={s.href} href={s.href} className="rounded px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-text/5">
            {s.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}
