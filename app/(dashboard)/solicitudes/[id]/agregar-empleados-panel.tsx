'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { agregarEmpleadoAction, agregarEmpleadosMasivoAction, type ResultadoAgregarMasivo } from './actions'

type EmpleadoOpcion = {
  id: string
  legajo: string
  nombre_completo: string
  area_id: string | null
  sector_id: string | null
  proceso_id: string | null
  ib_id: string | null
}

type Opciones = {
  areas: { id: string; nombre: string }[]
  sectores: { id: string; nombre: string; areaId: string }[]
  procesos: { id: string; nombre: string; sectorId: string }[]
  ibs: { id: string; descripcion: string }[]
}

// Debounce simple sin dependencias externas.
function useDebounced<T>(valor: T, ms: number) {
  const [debounced, setDebounced] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return debounced
}

async function buscarEmpleados(params: { q?: string; areaId?: string; sectorId?: string; procesoId?: string; nombre?: string; ibId?: string; limit?: string }) {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.areaId) qs.set('areaId', params.areaId)
  if (params.sectorId) qs.set('sectorId', params.sectorId)
  if (params.procesoId) qs.set('procesoId', params.procesoId)
  if (params.nombre) qs.set('nombre', params.nombre)
  if (params.ibId) qs.set('ibId', params.ibId)
  if (params.limit) qs.set('limit', params.limit)
  const res = await fetch(`/api/empleados/buscar?${qs.toString()}`)
  const json = await res.json()
  return (json.data ?? []) as EmpleadoOpcion[]
}

export function AgregarEmpleadosPanel({ solicitudId, opciones }: { solicitudId: string; opciones: Opciones }) {
  const router = useRouter()

  // ---------- Autocomplete individual (prioridad 1) ----------
  const [texto, setTexto] = useState('')
  const textoDebounced = useDebounced(texto, 300)
  const [resultadosAuto, setResultadosAuto] = useState<EmpleadoOpcion[]>([])
  const [pendingAuto, startAuto] = useTransition()
  const [errorAuto, setErrorAuto] = useState<string | null>(null)

  useEffect(() => {
    if (textoDebounced.trim().length < 2) {
      setResultadosAuto([])
      return
    }
    buscarEmpleados({ q: textoDebounced }).then(setResultadosAuto)
  }, [textoDebounced])

  function agregarUno(empleadoId: string) {
    startAuto(async () => {
      const result = await agregarEmpleadoAction(solicitudId, empleadoId)
      setErrorAuto(result.error ?? null)
      if (!result.error) {
        setTexto('')
        setResultadosAuto([])
        router.refresh()
      }
    })
  }

  // ---------- Selección múltiple con filtros (prioridad 2) ----------
  const [mostrarMasivo, setMostrarMasivo] = useState(false)
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroSector, setFiltroSector] = useState('')
  const [filtroProceso, setFiltroProceso] = useState('')
  const [filtroNombre, setFiltroNombre] = useState('')
  const filtroNombreDebounced = useDebounced(filtroNombre, 300)
  const [filtroIb, setFiltroIb] = useState('')
  const [resultadosMasivo, setResultadosMasivo] = useState<EmpleadoOpcion[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [pendingMasivo, startMasivo] = useTransition()
  const [resumenMasivo, setResumenMasivo] = useState<ResultadoAgregarMasivo[] | null>(null)

  const sectoresFiltrados = opciones.sectores.filter((s) => !filtroArea || s.areaId === filtroArea)
  const procesosFiltrados = opciones.procesos.filter((p) => !filtroSector || p.sectorId === filtroSector)

  useEffect(() => {
    if (!mostrarMasivo) return
    buscarEmpleados({
      areaId: filtroArea,
      sectorId: filtroSector,
      procesoId: filtroProceso,
      nombre: filtroNombreDebounced,
      ibId: filtroIb,
      limit: '100',
    }).then(setResultadosMasivo)
  }, [mostrarMasivo, filtroArea, filtroSector, filtroProceso, filtroNombreDebounced, filtroIb])

  function toggleSeleccion(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function agregarSeleccionados() {
    startMasivo(async () => {
      const result = await agregarEmpleadosMasivoAction(solicitudId, Array.from(seleccionados))
      if (result.error) {
        setResumenMasivo([{ empleadoId: '', ok: false, mensaje: result.error }])
        return
      }
      setResumenMasivo(result.resultados ?? [])
      setSeleccionados(new Set())
      router.refresh()
    })
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Agregar empleados</h2>
        <button
          type="button"
          onClick={() => setMostrarMasivo((v) => !v)}
          className="text-xs text-text-muted underline"
        >
          {mostrarMasivo ? 'Ocultar carga masiva' : 'Carga masiva por filtros'}
        </button>
      </div>

      {/* Autocomplete individual */}
      <div className="relative">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar por legajo o nombre..."
          className="w-full rounded border border-border px-3 py-2 text-sm"
        />
        {errorAuto && <p className="mt-1 text-xs text-red-600">{errorAuto}</p>}
        {resultadosAuto.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded border border-border bg-surface shadow-lg">
            {resultadosAuto.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  disabled={pendingAuto}
                  onClick={() => agregarUno(e.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-text/5 disabled:opacity-50"
                >
                  <span>{e.nombre_completo}</span>
                  <span className="text-xs text-text-muted">Legajo {e.legajo}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Carga masiva */}
      {mostrarMasivo && (
        <div className="space-y-3 border-t border-t-border pt-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <select
              value={filtroArea}
              onChange={(e) => {
                setFiltroArea(e.target.value)
                setFiltroSector('')
                setFiltroProceso('')
              }}
              className="rounded border border-border px-2 py-1.5 text-sm"
            >
              <option value="">Todas las áreas</option>
              {opciones.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
            <select
              value={filtroSector}
              onChange={(e) => {
                setFiltroSector(e.target.value)
                setFiltroProceso('')
              }}
              className="rounded border border-border px-2 py-1.5 text-sm"
            >
              <option value="">Todos los sectores</option>
              {sectoresFiltrados.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            <select value={filtroProceso} onChange={(e) => setFiltroProceso(e.target.value)} className="rounded border border-border px-2 py-1.5 text-sm">
              <option value="">Todos los procesos</option>
              {procesosFiltrados.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={filtroNombre}
              onChange={(e) => setFiltroNombre(e.target.value)}
              placeholder="Filtrar por nombre..."
              className="rounded border border-border px-2 py-1.5 text-sm"
            />
            <select value={filtroIb} onChange={(e) => setFiltroIb(e.target.value)} className="rounded border border-border px-2 py-1.5 text-sm">
              <option value="">Todos los IB</option>
              {opciones.ibs.map((ib) => (
                <option key={ib.id} value={ib.id}>
                  {ib.descripcion}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-72 overflow-y-auto rounded border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr>
                  <th className="w-8 px-2 py-1.5" />
                  <th className="px-2 py-1.5 text-left">Legajo</th>
                  <th className="px-2 py-1.5 text-left">Nombre</th>
                </tr>
              </thead>
              <tbody>
                {resultadosMasivo.map((e) => (
                  <tr key={e.id} className="border-t border-t-border hover:bg-text/5">
                    <td className="px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={seleccionados.has(e.id)}
                        onChange={() => toggleSeleccion(e.id)}
                      />
                    </td>
                    <td className="px-2 py-1.5">{e.legajo}</td>
                    <td className="px-2 py-1.5">{e.nombre_completo}</td>
                  </tr>
                ))}
                {resultadosMasivo.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-2 py-4 text-center text-text-muted">
                      Sin resultados para estos filtros
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={pendingMasivo || seleccionados.size === 0}
              onClick={agregarSeleccionados}
              className="rounded bg-primary px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {pendingMasivo ? 'Agregando...' : `Agregar ${seleccionados.size} seleccionados`}
            </button>
          </div>

          {resumenMasivo && (
            <ul className="space-y-1 text-xs">
              {resumenMasivo.map((r, i) => (
                <li key={i} className={r.ok ? 'text-green-700' : 'text-red-700'}>
                  {r.ok ? '✓' : '✗'} {r.mensaje}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
