'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { solicitudesRpc } from '@/lib/supabase/rpc'

// Next.js 16 exige que todo lo exportado desde un archivo 'use server' sea
// una función async declarada (`export async function nombre(...) {}`), no
// una const asignada a una arrow function — todas las acciones de este
// archivo siguen ese patrón.

// No exportada: helper interno, no una Server Action en sí.
// FIX Fase 5.3 (punto C): revalidatePath ahora SOLO se ejecuta si la
// operación tuvo éxito. Antes se llamaba siempre, incluso en error — no
// rompía nada (solo invalidaba un caché que de todos modos no cambió),
// pero es trabajo innecesario y una inconsistencia de estilo.
async function ejecutar(
  accion: (rpc: ReturnType<typeof solicitudesRpc>) => Promise<{ error: { message: string } | null }>,
  solicitudId: string
) {
  const supabase = await createClient()
  const { error } = await accion(solicitudesRpc(supabase))

  if (!error) {
    revalidatePath(`/solicitudes/${solicitudId}`)
    revalidatePath('/solicitudes')
  }

  return { error: error?.message }
}

export async function agregarEmpleadoAction(solicitudId: string, empleadoId: string) {
  return ejecutar(
    async (rpc) => await rpc.agregarEmpleado(solicitudId, empleadoId),
    solicitudId
  )
}

export async function quitarEmpleadoAction(
  solicitudId: string,
  solicitudEmpleadoId: string
) {
  return ejecutar(
    async (rpc) => await rpc.quitarEmpleado(solicitudEmpleadoId),
    solicitudId
  )
}

export async function aprobarEmpleadoAction(
  solicitudId: string,
  solicitudEmpleadoId: string
) {
  return ejecutar(
    async (rpc) => await rpc.aprobarEmpleado(solicitudEmpleadoId),
    solicitudId
  )
}

export async function rechazarEmpleadoAction(solicitudId: string, solicitudEmpleadoId: string) {
  return ejecutar(
    async (rpc) => await rpc.rechazarEmpleado(solicitudEmpleadoId),
    solicitudId
  )
}

export async function aprobarTodoAction(solicitudId: string) {
  return ejecutar(
    async (rpc) => await rpc.aprobarSolicitudCompleta(solicitudId),
    solicitudId
  )
}

export async function rechazarTodoAction(solicitudId: string) {
  return ejecutar(
    async (rpc) => await rpc.rechazarSolicitudCompleta(solicitudId),
    solicitudId
  )
}

export async function reabrirAction(solicitudId: string) {
  return ejecutar(
    async (rpc) => await rpc.reabrirSolicitud(solicitudId), solicitudId)
}

export async function finalizarCargaAction(solicitudId: string) {
  return ejecutar(
    async (rpc) => await rpc.finalizarCarga(solicitudId), solicitudId)
}

export async function volverAPendienteAction(solicitudId: string) {
  return ejecutar(
    async (rpc) => await rpc.volverAPendiente(solicitudId), solicitudId)
}

export async function eliminarAction(solicitudId: string) {
  return ejecutar(
    async (rpc) => await rpc.eliminarSolicitud(solicitudId), solicitudId)
}

export async function registrarIngresoAction(solicitudId: string, solicitudEmpleadoId: string, fechaHoraIngreso?: string) {
  return ejecutar(
    async (rpc) => await rpc.registrarControlIngreso(solicitudEmpleadoId, fechaHoraIngreso), solicitudId)
}

export async function registrarIngresoSolicitudAction(solicitudId: string, fechaHoraIngreso?: string) {
  return ejecutar(
    async (rpc) => await rpc.registrarControlIngresoSolicitud(solicitudId, fechaHoraIngreso), solicitudId)
}

export async function eliminarIngresoAction(solicitudId: string, solicitudEmpleadoId: string) {
  return ejecutar(
    async (rpc) => await rpc.eliminarControlIngreso(solicitudEmpleadoId), solicitudId)
}

export async function agregarEmpleadoPorLegajoAction(solicitudId: string, legajo: string) {
  const supabase = await createClient()

  const { data: empleado, error: buscarError } = await supabase
    .from('empleados')
    .select('id')
    .eq('legajo', legajo.trim())
    .maybeSingle()

  if (buscarError) return { error: buscarError.message }
  if (!empleado) return { error: `No se encontró ningún empleado con legajo ${legajo}` }

  return ejecutar(
    async (rpc) => await rpc.agregarEmpleado(solicitudId, empleado.id),
    solicitudId
  )
}

export type ResultadoAgregarMasivo = { empleadoId: string; ok: boolean; mensaje: string }

// Fila cruda que devuelve rpc_agregar_empleados_masivo (ver 0023) — tipada
// en vez de `any` (fix Fase 5.3, punto B).
type ResultadoAgregarMasivoRPC = { empleado_id: string; ok: boolean; mensaje: string }

export async function agregarEmpleadosMasivoAction(
  solicitudId: string,
  empleadoIds: string[]
): Promise<{ error?: string; resultados?: ResultadoAgregarMasivo[] }> {
  const supabase = await createClient()
  const { data, error } = await solicitudesRpc(supabase).agregarEmpleadosMasivo(solicitudId, empleadoIds)

  // FIX Fase 5.3 (punto C): antes se revalidaba siempre; ahora solo si no
  // hubo error de RPC (nota: el RPC en sí es "parcialmente exitoso" por
  // diseño — algunos empleados pueden fallar sin que `error` esté seteado
  // acá, ver `resultados` fila por fila — por eso igual conviene revalidar
  // si no hubo error de RPC, aunque algún empleado individual haya fallado).
  if (!error) {
    revalidatePath(`/solicitudes/${solicitudId}`)
    revalidatePath('/solicitudes')
  }

  if (error) return { error: error.message }

  const resultados: ResultadoAgregarMasivo[] = ((data as ResultadoAgregarMasivoRPC[] | null) ?? []).map((r) => ({
    empleadoId: r.empleado_id,
    ok: r.ok,
    mensaje: r.mensaje,
  }))

  return { resultados }
}
