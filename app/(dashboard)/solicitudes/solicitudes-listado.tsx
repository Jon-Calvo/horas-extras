'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { RowSelectionState } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { selectColumn, solicitudColumns, type SolicitudRow } from './columns'
import { aprobacionMasivaListadoAction } from './actions'

export function SolicitudesListado({ rows }: { rows: SolicitudRow[] }) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const idsSeleccionados = Object.keys(rowSelection).filter((id) => rowSelection[id])

  function ejecutarMasivo(accion: 'APROBAR' | 'RECHAZAR') {
    startTransition(async () => {
      const result = await aprobacionMasivaListadoAction(idsSeleccionados, accion)
      setError(result.error ?? null)
      if (!result.error) {
        setRowSelection({})
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-3">
      {idsSeleccionados.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-white p-3">
          <span className="text-sm text-slate-600">{idsSeleccionados.length} seleccionada(s)</span>
          <button
            disabled={pending}
            onClick={() => ejecutarMasivo('APROBAR')}
            className="rounded bg-green-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
          >
            Aprobar seleccionadas
          </button>
          <button
            disabled={pending}
            onClick={() => ejecutarMasivo('RECHAZAR')}
            className="rounded bg-red-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
          >
            Rechazar seleccionadas
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      )}

      <DataTable
        columns={[selectColumn, ...solicitudColumns]}
        data={rows}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(row) => row.id}
      />
    </div>
  )
}
