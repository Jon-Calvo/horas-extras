'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  aprobarTodoAction,
  eliminarAction,
  finalizarCargaAction,
  reabrirAction,
  registrarIngresoSolicitudAction,
  rechazarTodoAction,
  volverAPendienteAction,
} from './actions'
import type { EstadoSolicitud } from '@/lib/enums'
import { ModalFechaIngreso } from './modal-fecha-ingreso'

export function AccionesSolicitud({
  solicitudId,
  estadoSolicitud,
  puedeAprobar,
  puedeModificar,
  puedeReabrir,
  puedeControlIngreso,
}: {
  solicitudId: string
  estadoSolicitud: EstadoSolicitud
  puedeAprobar: boolean
  puedeModificar: boolean
  puedeReabrir: boolean
  puedeControlIngreso: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [modalIngresoMasivo, setModalIngresoMasivo] = useState(false)
  const router = useRouter()

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action()
      setError(result.error ?? null)
      if (!result.error) router.refresh()
    })
  }

  function confirmarIngresoMasivo(fechaHoraIso: string) {
    startTransition(async () => {
      const result = await registrarIngresoSolicitudAction(solicitudId, fechaHoraIso)
      setError(result.error ?? null)
      if (!result.error) {
        setModalIngresoMasivo(false)
        router.refresh()
      }
    })
  }

  // Aprobar/rechazar en lote: SOLO en ABIERTA (carga finalizada) — durante
  // PENDIENTE (borrador) no hay nada para aprobar todavía, aunque haya
  // empleados autoaprobados por un motivo sin requiere_aprobacion.
  const mostrarAprobacion = puedeAprobar && estadoSolicitud === 'ABIERTA'

  return (
    <div className="space-y-2">
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {puedeModificar && estadoSolicitud === 'PENDIENTE' && (
          <button
            disabled={pending}
            onClick={() => run(() => finalizarCargaAction(solicitudId))}
            className="rounded bg-primary px-3 py-1.5 text-xs text-white disabled:opacity-50"
          >
            Finalizar carga de solicitud
          </button>
        )}

        {mostrarAprobacion && (
          <>
            <button disabled={pending} onClick={() => run(() => aprobarTodoAction(solicitudId))} className="rounded bg-success px-3 py-1.5 text-xs text-white disabled:opacity-50">
              Aprobar todos los pendientes
            </button>
            <button disabled={pending} onClick={() => run(() => rechazarTodoAction(solicitudId))} className="rounded bg-danger px-3 py-1.5 text-xs text-white disabled:opacity-50">
              Rechazar todos los pendientes
            </button>
          </>
        )}

        {puedeReabrir && estadoSolicitud === 'ABIERTA' && (
          <button
            disabled={pending}
            onClick={() => run(() => volverAPendienteAction(solicitudId))}
            className="rounded border border-border px-3 py-1.5 text-xs disabled:opacity-50"
            title="Vuelve a borrador para poder agregar/quitar empleados. No modifica las decisiones ya tomadas."
          >
            Volver a borrador
          </button>
        )}

        {puedeControlIngreso && estadoSolicitud === 'CERRADA' && (
          <button disabled={pending} onClick={() => setModalIngresoMasivo(true)} className="rounded bg-primary px-3 py-1.5 text-xs text-white disabled:opacity-50">
            Registrar ingreso de toda la solicitud
          </button>
        )}
        {puedeReabrir && estadoSolicitud === 'CERRADA' && (
          <button disabled={pending} onClick={() => run(() => reabrirAction(solicitudId))} className="rounded border border-border px-3 py-1.5 text-xs disabled:opacity-50">
            Reabrir
          </button>
        )}
        {puedeModificar && estadoSolicitud !== 'ELIMINADA' && (
          <button disabled={pending} onClick={() => run(() => eliminarAction(solicitudId))} className="rounded border border-border border-red-300 px-3 py-1.5 text-xs text-red-700 disabled:opacity-50">
            Eliminar solicitud
          </button>
        )}
      </div>

      <ModalFechaIngreso
        abierto={modalIngresoMasivo}
        titulo="Registrar ingreso de toda la solicitud"
        pending={pending}
        onConfirmar={confirmarIngresoMasivo}
        onCancelar={() => setModalIngresoMasivo(false)}
      />
    </div>
  )
}
