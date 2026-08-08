'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarValorCategoria } from '../actions'

export function NuevoValorForm({ categoriaTipoId, monedaActual }: { categoriaTipoId: string; monedaActual: string }) {
  const [valorHora, setValorHora] = useState('')
  const [moneda, setMoneda] = useState(monedaActual)
  const [vigenciaDesde, setVigenciaDesde] = useState(new Date().toISOString().slice(0, 10))
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function guardar() {
    startTransition(async () => {
      const result = await actualizarValorCategoria({
        categoriaTipoId,
        valorHora: Number(valorHora),
        moneda,
        vigenciaDesde,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      setValorHora('')
      setError(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      <h3 className="text-sm font-semibold">Nuevo valor vigente</h3>
      <p className="text-xs text-slate-500">
        Cierra automáticamente la vigencia actual el día anterior a la fecha elegida — no hace falta hacerlo a mano.
      </p>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Valor hora</label>
          <input type="number" step="0.01" min="0" value={valorHora} onChange={(e) => setValorHora(e.target.value)} className="w-full rounded border px-2 py-1.5 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Moneda</label>
          <input type="text" value={moneda} onChange={(e) => setMoneda(e.target.value)} className="w-full rounded border px-2 py-1.5 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Vigente desde</label>
          <input type="date" value={vigenciaDesde} onChange={(e) => setVigenciaDesde(e.target.value)} className="w-full rounded border px-2 py-1.5 text-sm" />
        </div>
      </div>

      <button onClick={guardar} disabled={pending || !valorHora} className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50">
        {pending ? 'Guardando...' : 'Actualizar valor'}
      </button>
    </div>
  )
}
