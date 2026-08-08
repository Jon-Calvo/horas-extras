'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { ESTADO_SOLICITUD, ESTADO_SOLICITUD_LABEL } from '@/lib/enums'

type Opciones = {
  areas: { id: string; nombre: string }[]
  sectores: { id: string; nombre: string; areaId: string }[]
  procesos: { id: string; nombre: string; sectorId: string }[]
  solicitantes: { id: string; nombre: string }[]
  motivos: { id: string; motivo: string }[]
}

// Client Component "tonto": solo arma la querystring y navega. El filtrado
// real ya lo hace `page.tsx` (Server Component) leyendo esos mismos params
// contra `vista_solicitudes_resumen` — acá no se filtra nada del lado del
// cliente, así que no hay riesgo de mostrar algo que la RLS no permitiría.
export function SolicitudesFiltros({ opciones }: { opciones: Opciones }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [area, setArea] = useState(searchParams.get('area') ?? '')
  const [sector, setSector] = useState(searchParams.get('sector') ?? '')
  const [proceso, setProceso] = useState(searchParams.get('proceso') ?? '')
  const [estado, setEstado] = useState(searchParams.get('estado') ?? '')
  const [solicitante, setSolicitante] = useState(searchParams.get('solicitante') ?? '')
  const [motivo, setMotivo] = useState(searchParams.get('motivo') ?? '')
  const [desde, setDesde] = useState(searchParams.get('desde') ?? '')
  const [hasta, setHasta] = useState(searchParams.get('hasta') ?? '')

  const sectoresFiltrados = opciones.sectores.filter((s) => !area || s.areaId === area)
  const procesosFiltrados = opciones.procesos.filter((p) => !sector || p.sectorId === sector)

  function aplicar(overrides: Record<string, string> = {}) {
    const valores = { area, sector, proceso, estado, solicitante, motivo, desde, hasta, ...overrides }
    const qs = new URLSearchParams()
    Object.entries(valores).forEach(([k, v]) => {
      if (v) qs.set(k, v)
    })
    router.push(`/solicitudes?${qs.toString()}`)
  }

  function limpiar() {
    setArea('')
    setSector('')
    setProceso('')
    setEstado('')
    setSolicitante('')
    setMotivo('')
    setDesde('')
    setHasta('')
    router.push('/solicitudes')
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500">Área</label>
        <select
          value={area}
          onChange={(e) => {
            setArea(e.target.value)
            setSector('')
            setProceso('')
            aplicar({ area: e.target.value, sector: '', proceso: '' })
          }}
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option value="">Todas</option>
          {opciones.areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500">Sector</label>
        <select
          value={sector}
          onChange={(e) => {
            setSector(e.target.value)
            setProceso('')
            aplicar({ sector: e.target.value, proceso: '' })
          }}
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          {sectoresFiltrados.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500">Proceso</label>
        <select
          value={proceso}
          onChange={(e) => {
            setProceso(e.target.value)
            aplicar({ proceso: e.target.value })
          }}
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          {procesosFiltrados.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500">Estado</label>
        <select
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value)
            aplicar({ estado: e.target.value })
          }}
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          {ESTADO_SOLICITUD.map((e) => (
            <option key={e} value={e}>
              {ESTADO_SOLICITUD_LABEL[e]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500">Solicitante</label>
        <select
          value={solicitante}
          onChange={(e) => {
            setSolicitante(e.target.value)
            aplicar({ solicitante: e.target.value })
          }}
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          {opciones.solicitantes.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500">Motivo</label>
        <select
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value)
            aplicar({ motivo: e.target.value })
          }}
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          {opciones.motivos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.motivo}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500">Desde</label>
        <input
          type="date"
          value={desde}
          onChange={(e) => {
            setDesde(e.target.value)
            aplicar({ desde: e.target.value })
          }}
          className="rounded border px-2 py-1.5 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500">Hasta</label>
        <input
          type="date"
          value={hasta}
          onChange={(e) => {
            setHasta(e.target.value)
            aplicar({ hasta: e.target.value })
          }}
          className="rounded border px-2 py-1.5 text-sm"
        />
      </div>

      <button type="button" onClick={limpiar} className="rounded border px-3 py-1.5 text-sm text-slate-600">
        Limpiar filtros
      </button>
    </div>
  )
}
