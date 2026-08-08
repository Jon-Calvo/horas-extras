'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarPasswordPropia } from './actions'

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(actualizarPasswordPropia, { error: '', success: false })
  const router = useRouter()

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4 rounded-lg border bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold">Elegí tu nueva contraseña</h1>

      {state.error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">
          Contraseña nueva
        </label>
        <input id="password" name="password" type="password" required minLength={8} className="w-full rounded border px-3 py-2 text-sm" />
      </div>

      <div className="space-y-1">
        <label htmlFor="passwordConfirmacion" className="text-sm font-medium">
          Confirmar contraseña
        </label>
        <input
          id="passwordConfirmacion"
          name="passwordConfirmacion"
          type="password"
          required
          minLength={8}
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? 'Guardando...' : 'Guardar contraseña'}
      </button>

      {state.success && (
        <button type="button" onClick={() => router.push('/solicitudes')} className="w-full text-center text-sm text-slate-500 underline">
          Contraseña actualizada — ir al sistema
        </button>
      )}
    </form>
  )
}
