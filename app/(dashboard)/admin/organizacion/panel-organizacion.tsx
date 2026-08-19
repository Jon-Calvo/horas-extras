'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export type ItemOrganizacion = { id: string; nombre: string; activo: boolean }

// Genérico para los 3 niveles (área/sector/proceso) — comparten exactamente
// la misma interacción (buscar, listar, seleccionar, alta/edición inline,
// activar/desactivar), solo cambia el título, si necesita un "padre"
// seleccionado para poder dar de alta, y el mensaje cuando no hay nada
// seleccionado todavía. Es un componente propio (no el AdminEntityCrud que
// usan las otras maestras) porque el layout de 3 columnas angostas no
// encaja con el layout de tabla ancha de ese componente.
export function PanelOrganizacion({
  titulo,
  items,
  seleccionadoId,
  onSeleccionar,
  habilitadoParaAlta,
  mensajeSinHabilitar,
  onGuardar,
  onToggleActivo,
}: {
  titulo: string
  items: ItemOrganizacion[]
  seleccionadoId: string | null
  onSeleccionar?: (id: string) => void
  habilitadoParaAlta: boolean
  mensajeSinHabilitar?: string
  onGuardar: (id: string | null, nombre: string) => Promise<{ error?: string }>
  onToggleActivo: (id: string, activo: boolean) => Promise<{ error?: string }>
}) {
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<string | null>(null) // id, o 'NUEVO'
  const [nombreForm, setNombreForm] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const itemsFiltrados = items.filter((i) => i.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  function abrirNuevo() {
    setEditando('NUEVO')
    setNombreForm('')
    setError(null)
  }

  function abrirEditar(item: ItemOrganizacion) {
    setEditando(item.id)
    setNombreForm(item.nombre)
    setError(null)
  }

  function guardar() {
    if (!nombreForm.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    startTransition(async () => {
      const result = await onGuardar(editando === 'NUEVO' ? null : editando, nombreForm)
      if (result.error) {
        setError(result.error)
        return
      }
      setEditando(null)
      router.refresh()
    })
  }

  function toggle(item: ItemOrganizacion) {
    startTransition(async () => {
      const result = await onToggleActivo(item.id, !item.activo)
      setError(result.error ?? null)
      if (!result.error) router.refresh()
    })
  }

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-border bg-surface">
      <div className="border-b border-b-border p-3">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar..."
          className="mt-2 w-full rounded border border-border px-2 py-1 text-sm"
        />
      </div>

      <div className="max-h-96 flex-1 overflow-y-auto">
        {!habilitadoParaAlta && items.length === 0 && (
          <p className="p-4 text-center text-xs text-text-muted">{mensajeSinHabilitar}</p>
        )}
        {itemsFiltrados.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between border-b px-3 py-2 text-sm last:border-0 ${
              seleccionadoId === item.id ? 'bg-text/8' : 'hover:bg-text/5'
            }`}
          >
            <button
              type="button"
              onClick={() => onSeleccionar?.(item.id)}
              className={`flex-1 text-left ${!item.activo ? 'text-text-muted line-through' : ''} ${onSeleccionar ? '' : 'cursor-default'}`}
            >
              {item.nombre}
            </button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => abrirEditar(item)} className="text-xs text-text-muted underline">
                Editar
              </button>
              <button type="button" onClick={() => toggle(item)} disabled={pending} className="text-xs text-text-muted underline disabled:opacity-50">
                {item.activo ? 'Inactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
        {itemsFiltrados.length === 0 && items.length > 0 && (
          <p className="p-4 text-center text-xs text-text-muted">Sin resultados para "{busqueda}"</p>
        )}
      </div>

      <div className="border-t border-t-border p-3">
        {error && <p className="mb-2 rounded bg-red-50 px-2 py-1.5 text-xs text-red-700">{error}</p>}

        {editando === null ? (
          <button
            type="button"
            onClick={abrirNuevo}
            disabled={!habilitadoParaAlta}
            className="w-full rounded bg-primary px-3 py-1.5 text-xs text-white disabled:opacity-40"
            title={habilitadoParaAlta ? undefined : mensajeSinHabilitar}
          >
            + Nuevo
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={nombreForm}
              onChange={(e) => setNombreForm(e.target.value)}
              placeholder="Nombre"
              className="w-full rounded border border-border px-2 py-1.5 text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <button type="button" onClick={guardar} disabled={pending} className="flex-1 rounded bg-primary px-3 py-1.5 text-xs text-white disabled:opacity-50">
                {pending ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => setEditando(null)} disabled={pending} className="rounded border border-border px-3 py-1.5 text-xs disabled:opacity-50">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}