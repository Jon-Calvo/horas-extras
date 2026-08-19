'use client'

import { useState } from 'react'

// Sin librería de modal externa: overlay + panel con Tailwind. Se usa tanto
// para el ingreso de un empleado puntual como para el ingreso masivo de toda
// la solicitud (mismo timestamp para todos en ese caso).
export function ModalFechaIngreso({
  abierto,
  titulo,
  pending,
  onConfirmar,
  onCancelar,
}: {
  abierto: boolean
  titulo: string
  pending: boolean
  onConfirmar: (fechaHoraIsoConOffset: string) => void
  onCancelar: () => void
}) {
  // Valor por defecto: ahora, en hora de Argentina, en formato datetime-local.
  const ahoraArgentina = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })
  )
  const defaultValue = new Date(ahoraArgentina.getTime() - ahoraArgentina.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  const [valor, setValor] = useState(defaultValue)

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg bg-surface p-6 shadow-xl">
        <h2 className="text-sm font-semibold">{titulo}</h2>

        <div className="space-y-1">
          <label className="text-sm font-medium">Fecha y hora de ingreso</label>
          <input
            type="datetime-local"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            max={defaultValue}
            className="w-full rounded border border-border px-3 py-2 text-sm"
          />
          <p className="text-xs text-text-muted">Por defecto es ahora — se puede atrasar, no adelantar.</p>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancelar} disabled={pending} className="rounded border border-border px-3 py-1.5 text-sm disabled:opacity-50">
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending || !valor}
            onClick={() => onConfirmar(`${valor}:00-03:00`)}
            className="rounded bg-primary px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {pending ? 'Registrando...' : 'Confirmar ingreso'}
          </button>
        </div>
      </div>
    </div>
  )
}
