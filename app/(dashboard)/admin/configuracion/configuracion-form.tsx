'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarConfiguracionGeneral } from './actions'

export function ConfiguracionGeneralForm({
  inicial,
}: {
  inicial: {
    dias_maximos_antiguedad: number
    emails_activos: boolean
    ranking_periodo: 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL'
    control_ingreso_permite_eliminar: boolean
  }
}) {
  const [diasMaximosAntiguedad, setDiasMaximosAntiguedad] = useState(String(inicial.dias_maximos_antiguedad))
  const [emailsActivos, setEmailsActivos] = useState(inicial.emails_activos)
  const [rankingPeriodo, setRankingPeriodo] = useState(inicial.ranking_periodo)
  const [controlIngresoPermiteEliminar, setControlIngresoPermiteEliminar] = useState(inicial.control_ingreso_permite_eliminar)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)
  const router = useRouter()

  function guardar() {
    startTransition(async () => {
      const result = await actualizarConfiguracionGeneral({
        diasMaximosAntiguedad: Number(diasMaximosAntiguedad),
        emailsActivos,
        rankingPeriodo,
        controlIngresoPermiteEliminar,
      })
      if (result.error) {
        setError(result.error)
        setGuardado(false)
        return
      }
      setError(null)
      setGuardado(true)
      router.refresh()
    })
  }

  return (
    <div className="max-w-lg space-y-4 rounded-lg border bg-white p-6">
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {guardado && <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">Configuración guardada.</p>}

      <div className="space-y-1">
        <label className="text-sm font-medium">Días máximos de antigüedad para cargar solicitudes atrasadas</label>
        <input
          type="number"
          min="0"
          value={diasMaximosAntiguedad}
          onChange={(e) => setDiasMaximosAntiguedad(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="emailsActivos"
          type="checkbox"
          checked={emailsActivos}
          onChange={(e) => setEmailsActivos(e.target.checked)}
          className="h-5 w-5"
        />
        <label htmlFor="emailsActivos" className="text-sm font-medium">
          Notificaciones por email activas
        </label>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Período de reseteo de ranking</label>
        <select
          value={rankingPeriodo}
          onChange={(e) => setRankingPeriodo(e.target.value as typeof rankingPeriodo)}
          className="w-full rounded border px-3 py-2 text-sm"
        >
          <option value="MENSUAL">Mensual (día 1 de cada mes)</option>
          <option value="TRIMESTRAL">Trimestral (trimestre calendario)</option>
          <option value="ANUAL">Anual (1 de enero)</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="controlIngresoPermiteEliminar"
          type="checkbox"
          checked={controlIngresoPermiteEliminar}
          onChange={(e) => setControlIngresoPermiteEliminar(e.target.checked)}
          className="h-5 w-5"
        />
        <label htmlFor="controlIngresoPermiteEliminar" className="text-sm font-medium">
          Permitir eliminar registros de control de ingreso
        </label>
      </div>

      <button onClick={guardar} disabled={pending} className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </div>
  )
}
