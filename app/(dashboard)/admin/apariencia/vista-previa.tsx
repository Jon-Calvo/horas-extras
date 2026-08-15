'use client'

import type { CSSProperties } from 'react'
import { LogoEmpresaPresentacional } from '@/components/logo-empresa-presentacional'
import type { ValoresApariencia } from './actions'

// Aplica los valores de BORRADOR solo dentro de este contenedor (variables
// CSS locales al div, no las globales de :root) — el admin puede probar
// colores libremente sin que nadie más los vea hasta que se presione
// "Guardar cambios" (punto 11 del pedido: nada persiste hasta guardar).
export function VistaPrevia({ valores, logoUrl }: { valores: ValoresApariencia; logoUrl: string | null }) {
  const estiloLocal: CSSProperties = {
    ['--color-primary' as any]: valores.colorPrimario,
    ['--color-primary-hover' as any]: valores.colorPrimarioHover,
    ['--color-secondary' as any]: valores.colorSecundario,
    ['--color-accent' as any]: valores.colorAcento,
    ['--color-success' as any]: valores.colorExito,
    ['--color-warning' as any]: valores.colorAdvertencia,
    ['--color-danger' as any]: valores.colorError,
  }

  return (
    <div style={estiloLocal} className="overflow-hidden rounded-lg border">
      <div className="flex items-center gap-2 border-b bg-white px-4 py-3">
        <LogoEmpresaPresentacional logoUrl={logoUrl} nombreEmpresa={valores.nombreEmpresa} tamano={28} />
      </div>
      <div className="space-y-3 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">Dashboard</p>
        <div className="rounded-lg border bg-white p-3 shadow-sm">
          <p className="text-sm font-medium">Tarjeta de ejemplo</p>
          <p className="text-xs text-slate-500">Información</p>
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
