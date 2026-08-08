'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { solicitudesRpc } from '@/lib/supabase/rpc'
import { solicitudSchema } from '@/lib/validation/solicitud'

export async function crearSolicitud(_prevState: { error: string }, formData: FormData) {
  const parsed = solicitudSchema.safeParse({
    areaId: formData.get('areaId'),
    sectorId: formData.get('sectorId'),
    procesoId: formData.get('procesoId'),
    fechaHoraInicio: formData.get('fechaHoraInicio'),
    fechaHoraFin: formData.get('fechaHoraFin'),
    motivoId: formData.get('motivoId'),
    observacion: formData.get('observacion') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const supabase = await createClient()
  const { data, error } = await solicitudesRpc(supabase).crearSolicitud({
    ...parsed.data,
    // Los <input type="datetime-local"> mandan "2026-07-29T18:24" sin
    // timezone. El navegador de quien carga la solicitud siempre está en
    // Argentina, así que se interpreta como hora de Argentina (UTC-3 fijo,
    // no tiene horario de verano) y se convierte a UTC acá, antes de
    // guardar. Si el server corriera en otro huso (Vercel corre en UTC por
    // defecto) esto evita que la hora quede mal guardada.
    fechaHoraInicio: `${parsed.data.fechaHoraInicio}:00-03:00`,
    fechaHoraFin: `${parsed.data.fechaHoraFin}:00-03:00`,
  })

  // El error acá viene directo del RPC de Postgres (permisos, antigüedad
  // máxima, fechas inválidas, etc.) — el mensaje ya es apto para mostrar.
  if (error) {
    return { error: error.message }
  }

  redirect(`/solicitudes/${(data as { id: string }).id}`)
}
