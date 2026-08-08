'use client'

import { useState, useTransition } from 'react'
import {
  aprobarEmpleadoAction,
  eliminarIngresoAction,
  quitarEmpleadoAction,
  rechazarEmpleadoAction,
  registrarIngresoAction,
} from './actions'
import { ESTADO_EMPLEADO_APROBACION_LABEL, type EstadoEmpleadoAprobacion, type EstadoSolicitud } from '@/lib/enums'
import { formatFechaHora } from '@/lib/format'
import { ModalFechaIngreso } from './modal-fecha-ingreso'

export type EmpleadoDeSolicitud = {
  solicitudEmpleadoId: string
  legajo: string
  nombreCompleto: string
  ibDescripcion: string | null
  rankingHorasAlMomento: number | null
  estadoAprobacion: EstadoEmpleadoAprobacion
  totalHoras: number
  totalImporte: number
  fechaHoraIngreso: string | null
  puedeAprobar: boolean
  puedeModificar: boolean
  puedeControlIngreso: boolean
}

export function EmpleadosSolicitud({
  solicitudId,
  estadoSolicitud,
  empleados,
  puedeModificarSolicitud,
}: {
  solicitudId: string
  estadoSolicitud: EstadoSolicitud
  empleados: EmpleadoDeSolicitud[]
  puedeModificarSolicitud: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [modalIngresoPara, setModalIngresoPara] = useState<string | null>(null) // solicitudEmpleadoId

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action()
      setError(result.error ?? null)
    })
  }

  function confirmarIngreso(fechaHoraIso: string) {
    if (!modalIngresoPara) return
    const solicitudEmpleadoId = modalIngresoPara
    startTransition(async () => {
      const result = await registrarIngresoAction(solicitudId, solicitudEmpleadoId, fechaHoraIso)
      setError(result.error ?? null)
      if (!result.error) setModalIngresoPara(null)
    })
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Legajo</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">IB</th>
              <th className="px-3 py-2">Ranking (al solicitar)</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Horas</th>
              <th className="px-3 py-2">Importe</th>
              <th className="px-3 py-2">Ingreso</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {empleados.map((e) => (
              <tr key={e.solicitudEmpleadoId} className="border-b last:border-0">
                <td className="px-3 py-2">{e.legajo}</td>
                <td className="px-3 py-2">{e.nombreCompleto}</td>
                <td className="px-3 py-2">{e.ibDescripcion ?? '—'}</td>
                <td className="px-3 py-2">{e.rankingHorasAlMomento ?? '—'}</td>
                <td className="px-3 py-2">{ESTADO_EMPLEADO_APROBACION_LABEL[e.estadoAprobacion]}</td>
                <td className="px-3 py-2">{e.totalHoras.toFixed(2)}</td>
                <td className="px-3 py-2">{e.totalImporte.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-2">
                  {e.fechaHoraIngreso ? formatFechaHora(e.fechaHoraIngreso) : '—'}
                </td>
                <td className="flex gap-2 px-3 py-2">
                  {estadoSolicitud === 'ABIERTA' && e.estadoAprobacion === 'PENDIENTE_APROBACION' && e.puedeAprobar && (
                    <>
                      <button
                        disabled={pending}
                        onClick={() => run(() => aprobarEmpleadoAction(solicitudId, e.solicitudEmpleadoId))}
                        className="rounded bg-green-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                      <button
                        disabled={pending}
                        onClick={() => run(() => rechazarEmpleadoAction(solicitudId, e.solicitudEmpleadoId))}
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                  {estadoSolicitud === 'PENDIENTE' && e.puedeModificar && puedeModificarSolicitud && (
                    <button
                      disabled={pending}
                      onClick={() => run(() => quitarEmpleadoAction(solicitudId, e.solicitudEmpleadoId))}
                      className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                      title={
                        e.estadoAprobacion === 'APROBADO'
                          ? 'Este empleado ya está autoaprobado — quitarlo revierte el ranking que se le sumó'
                          : undefined
                      }
                    >
                      Quitar
                    </button>
                  )}
                  {e.estadoAprobacion === 'APROBADO' && !e.fechaHoraIngreso && e.puedeControlIngreso && (
                    <button
                      disabled={pending}
                      onClick={() => setModalIngresoPara(e.solicitudEmpleadoId)}
                      className="rounded bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-50"
                    >
                      Registrar ingreso
                    </button>
                  )}
                  {e.fechaHoraIngreso && e.puedeControlIngreso && (
                    <button
                      disabled={pending}
                      onClick={() => run(() => eliminarIngresoAction(solicitudId, e.solicitudEmpleadoId))}
                      className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                    >
                      Quitar ingreso
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {empleados.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-slate-400">
                  Todavía no se agregaron empleados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ModalFechaIngreso
        abierto={modalIngresoPara !== null}
        titulo="Registrar ingreso"
        pending={pending}
        onConfirmar={confirmarIngreso}
        onCancelar={() => setModalIngresoPara(null)}
      />
    </div>
  )
}

