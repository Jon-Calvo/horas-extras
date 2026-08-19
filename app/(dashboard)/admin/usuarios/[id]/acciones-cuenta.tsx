'use client'

import { useState, useTransition } from 'react'
import { activarDesactivarUsuario, enviarEmailRecuperacion, establecerPasswordTemporal } from '../actions'

export function AccionesCuenta({ usuarioId, email, activo }: { usuarioId: string; email: string; activo: boolean }) {
  const [passwordTemporal, setPasswordTemporal] = useState('')
  const [pending, startTransition] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  function ejecutar(fn: () => Promise<{ error?: string }>, mensajeOk: string) {
    startTransition(async () => {
      const result = await fn()
      setMensaje(result.error ? { tipo: 'error', texto: result.error } : { tipo: 'ok', texto: mensajeOk })
    })
  }

  return (
    <div className="max-w-2xl space-y-4 rounded-lg border border-border bg-surface p-6">
      <h2 className="text-sm font-semibold">Cuenta</h2>

      {mensaje && (
        <p className={`rounded px-3 py-2 text-sm ${mensaje.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {mensaje.texto}
        </p>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-text-muted">Restablecer contraseña — elegí una opción</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs text-text-muted">Contraseña temporal</label>
            <input
              type="text"
              value={passwordTemporal}
              onChange={(e) => setPasswordTemporal(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="rounded border border-border px-2 py-1.5 text-sm"
            />
          </div>
          <button
            disabled={pending || passwordTemporal.length < 8}
            onClick={() =>
              ejecutar(
                () => establecerPasswordTemporal(usuarioId, passwordTemporal),
                'Contraseña temporal establecida. Comunicásela al usuario por fuera del sistema.'
              )
            }
            className="rounded bg-primary px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Establecer temporal
          </button>
          <span className="text-xs text-text-muted">o</span>
          <button
            disabled={pending}
            onClick={() => ejecutar(() => enviarEmailRecuperacion(email), `Email de recuperación enviado a ${email}.`)}
            className="rounded border border-border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Enviar email de recuperación
          </button>
        </div>
      </div>

      <div className="border-t border-t-border pt-4">
        <p className="text-xs font-medium text-text-muted">Estado de la cuenta</p>
        <button
          disabled={pending}
          onClick={() =>
            ejecutar(
              () => activarDesactivarUsuario(usuarioId, !activo),
              activo ? 'Usuario desactivado.' : 'Usuario activado.'
            )
          }
          className={`mt-1 rounded px-3 py-1.5 text-sm text-white disabled:opacity-50 ${activo ? 'bg-danger' : 'bg-success'}`}
        >
          {activo ? 'Desactivar usuario' : 'Activar usuario'}
        </button>
        <p className="mt-1 text-xs text-text-muted">
          Un usuario desactivado no puede iniciar sesión. No se puede eliminar físicamente si tiene solicitudes o
          auditoría asociada — la desactivación es la forma segura de darlo de baja.
        </p>
      </div>
    </div>
  )
}