'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export type CampoAdmin =
  | { key: string; label: string; type: 'text' }
  | { key: string; label: string; type: 'number'; step?: string; min?: string }
  | { key: string; label: string; type: 'checkbox' }
  | { key: string; label: string; type: 'date' }
  | { key: string; label: string; type: 'time' }
  | { key: string; label: string; type: 'select'; opciones: { value: string; label: string }[] }

// ABM genérico: tabla de lectura + un form (alta o edición, mismo componente)
// que aparece debajo. No intenta ser un framework — cubre el patrón que se
// repite en motivos/bandas horarias/feriados/IB: campos planos, sin
// versionado ni relaciones complejas (esas van en pantallas propias:
// categorías y configuración general).
export function AdminEntityCrud<T extends Record<string, any> & { id: string }>({
  campos,
  filas,
  onGuardar,
  onEliminar,
  renderCelda,
}: {
  campos: CampoAdmin[]
  filas: T[]
  onGuardar: (id: string | null, valores: Record<string, any>) => Promise<{ error?: string }>
  onEliminar?: (id: string) => Promise<{ error?: string }>
  renderCelda?: (fila: T, campo: CampoAdmin) => React.ReactNode
}) {
  const [editando, setEditando] = useState<string | null>(null) // id de la fila, o 'NUEVO'
  const [valores, setValores] = useState<Record<string, any>>({})
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function abrirNuevo() {
    setEditando('NUEVO')
    setValores(Object.fromEntries(campos.map((c) => [c.key, c.type === 'checkbox' ? c.key === 'activo' : ''])))
    setError(null)
  }

  function abrirEditar(fila: T) {
    setEditando(fila.id)
    setValores(Object.fromEntries(campos.map((c) => [c.key, fila[c.key]])))
    setError(null)
  }

  function guardar() {
    startTransition(async () => {
      const result = await onGuardar(editando === 'NUEVO' ? null : editando, valores)
      if (result.error) {
        setError(result.error)
        return
      }
      setEditando(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left">
            <tr>
              {campos.map((c) => (
                <th key={c.key} className="px-3 py-2 font-medium text-slate-600">
                  {c.label}
                </th>
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.id} className="border-b last:border-0">
                {campos.map((c) => (
                  <td key={c.key} className="px-3 py-2">
                    {renderCelda ? renderCelda(fila, c) : c.type === 'checkbox' ? (fila[c.key] ? 'Sí' : 'No') : String(fila[c.key] ?? '')}
                  </td>
                ))}
                <td className="flex gap-2 px-3 py-2">
                  <button onClick={() => abrirEditar(fila)} className="text-xs text-slate-500 underline">
                    Editar
                  </button>
                  {onEliminar && (
                    <button
                      onClick={() =>
                        startTransition(async () => {
                          const result = await onEliminar(fila.id)
                          if (result.error) setError(result.error)
                          else router.refresh()
                        })
                      }
                      disabled={pending}
                      className="text-xs text-red-600 underline disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={campos.length + 1} className="px-3 py-6 text-center text-slate-400">
                  Sin registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editando === null && (
        <button onClick={abrirNuevo} className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white">
          + Nuevo
        </button>
      )}

      {editando !== null && (
        <div className="space-y-3 rounded-lg border bg-white p-4">
          <h3 className="text-sm font-semibold">{editando === 'NUEVO' ? 'Nuevo registro' : 'Editar registro'}</h3>

          {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {campos.map((c) => (
              <div key={c.key} className="space-y-1">
                <label className="text-xs font-medium text-slate-500">{c.label}</label>
                {c.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={Boolean(valores[c.key])}
                    onChange={(e) => setValores((v) => ({ ...v, [c.key]: e.target.checked }))}
                    className="block h-5 w-5"
                  />
                ) : c.type === 'select' ? (
                  <select
                    value={valores[c.key] ?? ''}
                    onChange={(e) => setValores((v) => ({ ...v, [c.key]: e.target.value }))}
                    className="w-full rounded border px-2 py-1.5 text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {c.opciones.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={c.type}
                    step={c.type === 'number' ? c.step : undefined}
                    min={c.type === 'number' ? c.min : undefined}
                    value={valores[c.key] ?? ''}
                    onChange={(e) => setValores((v) => ({ ...v, [c.key]: e.target.value }))}
                    className="w-full rounded border px-2 py-1.5 text-sm"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={guardar} disabled={pending} className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50">
              {pending ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => setEditando(null)} disabled={pending} className="rounded border px-3 py-1.5 text-sm disabled:opacity-50">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
