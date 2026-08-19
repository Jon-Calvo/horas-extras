'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EmpleadoForm } from './empleado-form'
import { eliminarEmpleadoAction, fusionarEmpleadosAction } from './actions'

export type EmpleadoRow = {
  id: string
  legajo: string
  nombreCompleto: string
  categoriaCodigo: string
  areaNombre: string | null
  sectorNombre: string | null
  procesoNombre: string | null
  estado: 'ACTIVO' | 'INACTIVO'
  rankingHoras: number
  ibDescripcion: string | null
  areaId: string
  sectorId: string
  procesoId: string
}

type Opciones = {
  areas: { id: string; nombre: string }[]
  sectores: { id: string; nombre: string; areaId: string }[]
  procesos: { id: string; nombre: string; sectorId: string }[]
  categorias: { codigo: string; descripcion: string | null }[]
}

export function EmpleadosLista({ empleados, opciones, esAdmin }: { empleados: EmpleadoRow[]; opciones: Opciones; esAdmin: boolean }) {
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<string | null>(null) // legajo del empleado, o 'NUEVO'
  const [mostrarFusion, setMostrarFusion] = useState(false)
  const [pending, startTransition] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const router = useRouter()

  const filtrados = empleados.filter(
    (e) => e.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) || e.legajo.includes(busqueda)
  )

  const empleadoEnEdicion = editando && editando !== 'NUEVO' ? empleados.find((e) => e.legajo === editando) : null

  function eliminar(e: EmpleadoRow) {
    if (!confirm(`¿Eliminar a "${e.nombreCompleto}" (legajo ${e.legajo})? Si tiene historial de solicitudes, se dará de baja lógica en vez de borrarse.`)) {
      return
    }
    startTransition(async () => {
      const result = await eliminarEmpleadoAction(e.id)
      if (result.error) {
        setMensaje({ tipo: 'error', texto: result.error })
      } else {
        setMensaje({ tipo: 'ok', texto: result.mensaje ?? `${result.accionRealizada}` })
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-3">
      {mensaje && (
        <p className={`rounded px-3 py-2 text-sm ${mensaje.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {mensaje.texto}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por legajo o nombre..."
          className="max-w-xs rounded border border-border px-3 py-1.5 text-sm"
        />
        {editando === null && (
          <button onClick={() => setEditando('NUEVO')} className="rounded bg-primary px-3 py-1.5 text-sm text-white">
            + Nuevo empleado
          </button>
        )}
        {esAdmin && (
          <button onClick={() => setMostrarFusion((v) => !v)} className="rounded border border-border px-3 py-1.5 text-sm text-text-muted">
            {mostrarFusion ? 'Ocultar fusión de duplicados' : 'Fusionar empleados duplicados'}
          </button>
        )}
      </div>

      {mostrarFusion && esAdmin && (
        <PanelFusion empleados={empleados} onHecho={() => router.refresh()} />
      )}

      {editando !== null && (
        <EmpleadoForm
          opciones={opciones}
          onCerrar={() => setEditando(null)}
          valoresIniciales={
            empleadoEnEdicion
              ? {
                  legajo: empleadoEnEdicion.legajo,
                  nombreCompleto: empleadoEnEdicion.nombreCompleto,
                  categoriaCodigo: empleadoEnEdicion.categoriaCodigo,
                  areaId: empleadoEnEdicion.areaId ?? '',
                  sectorId: empleadoEnEdicion.sectorId ?? '',
                  procesoId: empleadoEnEdicion.procesoId ?? '',
                  estado: empleadoEnEdicion.estado,
                }
              : undefined
          }
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-b-border bg-background text-left">
            <tr>
              <th className="px-3 py-2">Legajo</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2">Área / Sector / Proceso</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Ranking</th>
              <th className="px-3 py-2">IB</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtrados.map((e) => (
              <tr key={e.id} className="border-b border-b-border last:border-0">
                <td className="px-3 py-2">{e.legajo}</td>
                <td className="px-3 py-2">{e.nombreCompleto}</td>
                <td className="px-3 py-2">{e.categoriaCodigo}</td>
                <td className="px-3 py-2 text-xs text-text-muted">
                  {[e.areaNombre, e.sectorNombre, e.procesoNombre].filter(Boolean).join(' / ') || '—'}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${e.estado === 'ACTIVO' ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-500'}`}>
                    {e.estado}
                  </span>
                </td>
                <td className="px-3 py-2">{e.rankingHoras.toFixed(2)}</td>
                <td className="px-3 py-2">{e.ibDescripcion ?? '—'}</td>
                <td className="flex gap-2 px-3 py-2">
                  <button onClick={() => setEditando(e.legajo)} className="text-xs text-text-muted underline">
                    Editar
                  </button>
                  {/* Botón visible únicamente para ADMIN. La seguridad real
                      está en rpc_eliminar_o_inactivar_empleado (fn_es_admin())
                      y en la policy de RLS de DELETE — ocultarlo acá es solo
                      UX, no la protección (Fase 7.3). */}
                  {esAdmin && (
                    <button onClick={() => eliminar(e)} disabled={pending} className="text-xs text-red-600 underline disabled:opacity-50">
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-text-muted">
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PanelFusion({ empleados, onHecho }: { empleados: EmpleadoRow[]; onHecho: () => void }) {
  const [conservarId, setConservarId] = useState('')
  const [fusionarId, setFusionarId] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function confirmar() {
    if (!conservarId || !fusionarId) return
    const conservar = empleados.find((e) => e.id === conservarId)
    const fusionar = empleados.find((e) => e.id === fusionarId)
    if (!confirm(`Se va a ELIMINAR "${fusionar?.nombreCompleto}" (legajo ${fusionar?.legajo}) y su historial pasa a "${conservar?.nombreCompleto}" (legajo ${conservar?.legajo}). Esta acción no se puede deshacer. ¿Confirmás?`)) {
      return
    }
    startTransition(async () => {
      const result = await fusionarEmpleadosAction(conservarId, fusionarId)
      if (result.error) {
        setError(result.error)
      } else {
        setError(null)
        setConservarId('')
        setFusionarId('')
        onHecho()
      }
    })
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-amber-50 p-4">
      <p className="text-sm font-medium">Fusionar dos registros que resultaron ser el mismo empleado</p>
      <p className="text-xs text-text-muted">
        Usalo cuando el mismo empleado quedó cargado dos veces (por ejemplo, una vez sin legajo y otra con legajo real).
        Se reasigna todo el historial (solicitudes, ranking) del que se descarta hacia el que se conserva, y se elimina
        el registro descartado.
      </p>
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted">Conservar (el registro correcto)</label>
          <select value={conservarId} onChange={(e) => setConservarId(e.target.value)} className="w-full rounded border border-border px-2 py-1.5 text-sm">
            <option value="">Seleccionar...</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombreCompleto} — legajo {e.legajo || '(vacío)'}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted">Fusionar y eliminar (el duplicado)</label>
          <select value={fusionarId} onChange={(e) => setFusionarId(e.target.value)} className="w-full rounded border border-border px-2 py-1.5 text-sm">
            <option value="">Seleccionar...</option>
            {empleados
              .filter((e) => e.id !== conservarId)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombreCompleto} — legajo {e.legajo || '(vacío)'}
                </option>
              ))}
          </select>
        </div>
      </div>
      <button
        onClick={confirmar}
        disabled={pending || !conservarId || !fusionarId}
        className="rounded bg-warning px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {pending ? 'Fusionando...' : 'Fusionar'}
      </button>
    </div>
  )
}