'use client'

import { useActionState, useState } from 'react'
import { guardarEmpleado } from './actions'

type Opciones = {
  areas: { id: string; nombre: string }[]
  sectores: { id: string; nombre: string; areaId: string }[]
  procesos: { id: string; nombre: string; sectorId: string }[]
  categorias: { codigo: string; descripcion: string | null }[]
}

export function EmpleadoForm({
  opciones,
  valoresIniciales,
  onCerrar,
}: {
  opciones: Opciones
  valoresIniciales?: {
    legajo: string
    nombreCompleto: string
    categoriaCodigo: string
    areaId: string
    sectorId: string
    procesoId: string
    estado: 'ACTIVO' | 'INACTIVO'
  }
  onCerrar: () => void
}) {
  const [state, formAction, pending] = useActionState(guardarEmpleado, { error: '' })

  const [areaId, setAreaId] = useState(valoresIniciales?.areaId ?? '')
  const [sectorId, setSectorId] = useState(valoresIniciales?.sectorId ?? '')
  const [procesoId, setProcesoId] = useState(valoresIniciales?.procesoId ?? '')

  const sectoresFiltrados = opciones.sectores.filter((s) => !areaId || s.areaId === areaId)
  const procesosFiltrados = opciones.procesos.filter((p) => !sectorId || p.sectorId === sectorId)

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-border bg-surface p-4">
      {state.error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted">Legajo</label>
          <input
            type="text"
            name="legajo"
            defaultValue={valoresIniciales?.legajo}
            disabled={Boolean(valoresIniciales)}
            className="w-full rounded border border-border px-2 py-1.5 text-sm disabled:bg-background disabled:text-text-muted"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted">Nombre completo</label>
          <input type="text" name="nombreCompleto" defaultValue={valoresIniciales?.nombreCompleto} className="w-full rounded border border-border px-2 py-1.5 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted">Categoría</label>
          <select name="categoriaCodigo" defaultValue={valoresIniciales?.categoriaCodigo} className="w-full rounded border border-border px-2 py-1.5 text-sm">
            <option value="">Seleccionar...</option>
            {opciones.categorias.map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.codigo} {c.descripcion ? `— ${c.descripcion}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted">Área</label>
          <select
            name="areaId"
            value={areaId}
            onChange={(e) => {
              setAreaId(e.target.value)
              setSectorId('')
              setProcesoId('')
            }}
            className="w-full rounded border border-border px-2 py-1.5 text-sm"
          >
            <option value="">Sin especificar</option>
            {opciones.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted">Sector</label>
          <select
            name="sectorId"
            value={sectorId}
            onChange={(e) => {
              setSectorId(e.target.value)
              setProcesoId('')
            }}
            className="w-full rounded border border-border px-2 py-1.5 text-sm"
          >
            <option value="">Sin especificar</option>
            {sectoresFiltrados.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted">Proceso</label>
          <select name="procesoId" value={procesoId} onChange={(e) => setProcesoId(e.target.value)} className="w-full rounded border border-border px-2 py-1.5 text-sm">
            <option value="">Sin especificar</option>
            {procesosFiltrados.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted">Estado</label>
          <select name="estado" defaultValue={valoresIniciales?.estado ?? 'ACTIVO'} className="w-full rounded border border-border px-2 py-1.5 text-sm">
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded bg-primary px-3 py-1.5 text-sm text-white disabled:opacity-50">
          {pending ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" onClick={onCerrar} className="rounded border border-border px-3 py-1.5 text-sm">
          Cancelar
        </button>
      </div>
    </form>
  )
}
