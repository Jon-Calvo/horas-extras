'use client'

import { useTheme } from '@/lib/theme/theme-provider'
import type { PreferenciaTema } from '@/lib/theme/tokens'

const OPCIONES: { valor: PreferenciaTema; label: string }[] = [
  { valor: 'CLARO', label: 'Claro' },
  { valor: 'OSCURO', label: 'Oscuro' },
  { valor: 'SISTEMA', label: 'Sistema' },
]

// Preferencia PERSONAL — cualquier usuario puede cambiar su propio modo
// claro/oscuro, no requiere ser admin (eso es "tema predeterminado de la
// empresa", que sí es admin-only, ver /admin/apariencia).
export function SelectorTema({ compacto = false }: { compacto?: boolean }) {
  const { preferencia, setPreferencia } = useTheme()

  if (compacto) {
    return (
      <select
        value={preferencia}
        onChange={(e) => setPreferencia(e.target.value as PreferenciaTema)}
        className="rounded border border-border bg-surface px-2 py-1 text-xs text-text"
      >
        {OPCIONES.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <div className="flex gap-2">
      {OPCIONES.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => setPreferencia(o.valor)}
          className={`rounded px-3 py-1.5 text-sm ${
            preferencia === o.valor
              ? 'bg-primary text-white'
              : 'border border-border text-text-muted hover:bg-background'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
