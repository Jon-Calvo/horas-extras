'use client'

import type { CSSProperties } from 'react'
import { LogoEmpresaPresentacional } from '@/components/logo-empresa-presentacional'
import type { ValoresApariencia } from './actions'

// Aplica los valores de BORRADOR solo dentro de este contenedor (variables
// CSS locales al div, no las globales de :root) — el admin puede probar
// colores libremente sin que nadie más los vea hasta que se presione
// "Guardar cambios" (punto 11 del pedido: nada persiste hasta guardar).
// CSSProperties no incluye custom properties CSS (--variable) en su tipo —
// esta extensión evita el `as any` por cada clave sin perder el chequeo de
// tipos del resto de las propiedades de estilo.
type EstiloConVariablesCss = CSSProperties & Record<`--${string}`, string>

export function VistaPrevia({ valores, logoUrl }: { valores: ValoresApariencia; logoUrl: string | null }) {
  const estiloLocal: EstiloConVariablesCss = {
    '--color-primary': valores.colorPrimario,
    '--color-primary-hover': valores.colorPrimarioHover,
    '--color-secondary': valores.colorSecundario,
    '--color-accent': valores.colorAcento,
    '--color-success': valores.colorExito,
    '--color-warning': valores.colorAdvertencia,
    '--color-danger': valores.colorError,
  }

  return (
    <div style={estiloLocal} className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-b-border bg-surface px-4 py-3">
        <LogoEmpresaPresentacional logoUrl={logoUrl} nombreEmpresa={valores.nombreEmpresa} tamano={28} />
      </div>
      <div className="space-y-3 bg-background p-4">
        <p className="text-sm font-medium text-text">Dashboard</p>
        <div className="rounded-lg border border-border bg-surface p-3 shadow-sm">
          <p className="text-sm font-medium">Tarjeta de ejemplo</p>
          <p className="text-xs text-text-muted">Información</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" style={{ backgroundColor: 'var(--color-primary)' }} className="rounded px-3 py-1.5 text-sm text-white">
            Botón principal
          </button>
          <button type="button" style={{ backgroundColor: 'var(--color-success)' }} className="rounded px-3 py-1.5 text-sm text-white">
            Éxito
          </button>
          <button type="button" style={{ backgroundColor: 'var(--color-warning)' }} className="rounded px-3 py-1.5 text-sm text-white">
            Advertencia
          </button>
          <button type="button" style={{ backgroundColor: 'var(--color-danger)' }} className="rounded px-3 py-1.5 text-sm text-white">
            Error
          </button>
        </div>
      </div>
    </div>
  )
}
