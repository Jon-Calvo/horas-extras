'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/solicitudes', label: 'Solicitudes' },
  { href: '/solicitudes/nueva', label: 'Nueva solicitud' },
  { href: '/admin', label: 'Administración' },
]

// Misma funcionalidad que el nav anterior (mismos 2 links + logout), solo
// cambia la presentación: fija a la izquierda en desktop (md+), y un drawer
// deslizable con overlay en mobile. Sin librerías nuevas, solo Tailwind +
// estado local para abrir/cerrar en mobile.
export function Sidebar({
  userEmail,
  esAdmin,
  logoutForm,
}: {
  userEmail: string | undefined
  esAdmin: boolean
  logoutForm: React.ReactNode
}) {
  const [abierto, setAbierto] = useState(false)
  const pathname = usePathname()
  const links = esAdmin ? LINKS : LINKS.filter((l) => l.href !== '/admin')

  const contenido = (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="px-4 py-4 text-sm font-semibold">Horas Extras</div>
        <nav className="flex flex-col gap-1 px-2">
          {links.map((link) => {
            const activo = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setAbierto(false)}
                className={`rounded px-3 py-2 text-sm font-medium ${
                  activo ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="space-y-2 border-t px-4 py-4 text-sm text-slate-600">
        <p className="truncate">{userEmail}</p>
        {logoutForm}
      </div>
    </div>
  )

  return (
    <>
      {/* Barra superior solo visible en mobile: hamburguesa + título */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
        <span className="text-sm font-semibold">Horas Extras</span>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          className="rounded p-2 hover:bg-slate-100"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Sidebar fija en desktop */}
      <aside className="hidden w-56 shrink-0 border-r bg-white md:block">{contenido}</aside>

      {/* Drawer en mobile */}
      {abierto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAbierto(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="flex justify-end p-2">
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar menú" className="rounded p-2 hover:bg-slate-100">
                ✕
              </button>
            </div>
            {contenido}
          </aside>
        </div>
      )}
    </>
  )
}
