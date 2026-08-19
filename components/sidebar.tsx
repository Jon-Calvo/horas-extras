'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoEmpresaPresentacional } from './logo-empresa-presentacional'
import { SelectorTema } from './selector-tema'

const LINKS = [
  { href: '/solicitudes', label: 'Solicitudes' },
  { href: '/solicitudes/nueva', label: 'Nueva solicitud' },
  { href: '/admin', label: 'Administración' },
]

// Misma funcionalidad que antes (mismos 3 links + logout), con dos
// agregados de este módulo: el logo/nombre reales (antes "Horas Extras"
// fijo, ahora vienen por props desde (dashboard)/layout.tsx, que sí puede
// resolver <LogoEmpresa /> por ser Server Component) y el selector de
// tema personal (cualquier usuario, no requiere ser admin).
export function Sidebar({
  userEmail,
  esAdmin,
  logoUrl,
  nombreEmpresa,
  logoutForm,
}: {
  userEmail: string | undefined
  esAdmin: boolean
  logoUrl: string | null
  nombreEmpresa: string
  logoutForm: React.ReactNode
}) {
  const [abierto, setAbierto] = useState(false)
  const pathname = usePathname()
  const links = esAdmin ? LINKS : LINKS.filter((l) => l.href !== '/admin')

  const contenido = (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="px-4 py-4">
          <LogoEmpresaPresentacional logoUrl={logoUrl} nombreEmpresa={nombreEmpresa} tamano={28} />
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {links.map((link) => {
            const activo = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setAbierto(false)}
                className={`rounded px-3 py-2 text-sm font-medium ${
                  activo
                    ? 'bg-primary text-white'
                    : 'text-text-muted hover:bg-background'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="space-y-3 border-t border-border px-4 py-4 text-sm text-text-muted">
        <SelectorTema compacto />
        <p className="truncate">{userEmail}</p>
        {logoutForm}
      </div>
    </div>
  )

  return (
    <>
      {/* Barra superior solo visible en mobile: hamburguesa + título */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <LogoEmpresaPresentacional logoUrl={logoUrl} nombreEmpresa={nombreEmpresa} tamano={24} />
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          className="rounded p-2 hover:bg-text/5"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Sidebar fija en desktop */}
      <aside className="hidden w-56 shrink-0 border-r border-border bg-surface md:block">{contenido}</aside>

      {/* Drawer en mobile */}
      {abierto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAbierto(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-surface shadow-xl">
            <div className="flex justify-end p-2">
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar menú" className="rounded p-2 hover:bg-text/5">
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

