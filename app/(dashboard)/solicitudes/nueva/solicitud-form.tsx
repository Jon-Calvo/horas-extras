'use client'

import { useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { solicitudSchema, type SolicitudFormValues } from '@/lib/validation/solicitud'
import { crearSolicitud } from './actions'

// Nota: area/sector/proceso/motivo deberían venir de un fetch a las tablas
// maestras (via Server Component padre y pasados como props) para armar
// selects reales con cascada área→sector→proceso. Se deja como <select>
// simple con placeholders para no acoplar esta pantalla a datos de ejemplo;
// reemplazar `opciones` por las props reales al integrarlo.
export function SolicitudForm({
  opciones,
}: {
  opciones: {
    areas: { id: string; nombre: string }[]
    sectores: { id: string; nombre: string; areaId: string }[]
    procesos: { id: string; nombre: string; sectorId: string }[]
    motivos: { id: string; motivo: string }[]
  }
}) {
  const [state, formAction, pending] = useActionState(crearSolicitud, { error: '' })

  const {
    register,
    watch,
    formState: { errors },
  } = useForm<SolicitudFormValues>({
    resolver: zodResolver(solicitudSchema),
  })

  const areaId = watch('areaId')
  const sectorId = watch('sectorId')

  const sectoresFiltrados = opciones.sectores.filter((s) => s.areaId === areaId)
  const procesosFiltrados = opciones.procesos.filter((p) => p.sectorId === sectorId)

  return (
    <form action={formAction} className="max-w-xl space-y-4 rounded-lg border border-border bg-surface p-6">
      <h1 className="text-lg font-semibold">Nueva solicitud</h1>

      {state?.error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <div className="space-y-1">
        <label className="text-sm font-medium">Área</label>
        <select {...register('areaId')} className="w-full rounded border border-border px-3 py-2 text-sm">
          <option value="">Seleccionar...</option>
          {opciones.areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
        {errors.areaId && <p className="text-xs text-red-600">{errors.areaId.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Sector</label>
        <select {...register('sectorId')} className="w-full rounded border border-border px-3 py-2 text-sm" disabled={!areaId}>
          <option value="">Seleccionar...</option>
          {sectoresFiltrados.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
        {errors.sectorId && <p className="text-xs text-red-600">{errors.sectorId.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Proceso</label>
        <select {...register('procesoId')} className="w-full rounded border border-border px-3 py-2 text-sm" disabled={!sectorId}>
          <option value="">Seleccionar...</option>
          {procesosFiltrados.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        {errors.procesoId && <p className="text-xs text-red-600">{errors.procesoId.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Fecha y hora de inicio</label>
          <input type="datetime-local" {...register('fechaHoraInicio')} className="w-full rounded border border-border px-3 py-2 text-sm" />
          {errors.fechaHoraInicio && <p className="text-xs text-red-600">{errors.fechaHoraInicio.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Fecha y hora de fin</label>
          <input type="datetime-local" {...register('fechaHoraFin')} className="w-full rounded border border-border px-3 py-2 text-sm" />
          {errors.fechaHoraFin && <p className="text-xs text-red-600">{errors.fechaHoraFin.message}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Motivo</label>
        <select {...register('motivoId')} className="w-full rounded border border-border px-3 py-2 text-sm">
          <option value="">Seleccionar...</option>
          {opciones.motivos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.motivo}
            </option>
          ))}
        </select>
        {errors.motivoId && <p className="text-xs text-red-600">{errors.motivoId.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Observación</label>
        <textarea {...register('observacion')} className="w-full rounded border border-border px-3 py-2 text-sm" rows={3} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? 'Creando...' : 'Crear solicitud'}
      </button>
    </form>
  )
}