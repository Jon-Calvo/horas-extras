'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { empleadosRpc } from '@/lib/supabase/rpc'
import { parseEstadoEmpleado } from '@/lib/enums'
import { leerCampoStringOpcional } from '@/lib/assert'

// Firma (prevState, formData) a propósito — mismo criterio que
// crearUsuario/actualizarUsuario (Fase 5.2): se pasa DIRECTO como prop al
// Client Component (`<EmpleadoForm action={guardarEmpleado} />`), nunca
// envuelta en una arrow function, que es justamente lo que rompía el
// módulo de usuarios en esa fase.
export async function guardarEmpleado(_prevState: { error: string }, formData: FormData): Promise<{ error: string }> {
  const supabase = await createClient()

  const legajo = String(formData.get('legajo') ?? '').trim()
  const nombreCompleto = String(formData.get('nombreCompleto') ?? '').trim()
  const categoriaCodigo = String(formData.get('categoriaCodigo') ?? '')
  const areaId = leerCampoStringOpcional(formData, 'areaId')
  const sectorId = leerCampoStringOpcional(formData, 'sectorId')
  const procesoId = leerCampoStringOpcional(formData, 'procesoId')
  const estado = parseEstadoEmpleado(String(formData.get('estado') ?? 'ACTIVO')) ?? 'ACTIVO'

  if (!legajo || !nombreCompleto || !categoriaCodigo) {
    return { error: 'Legajo, nombre y categoría son obligatorios' }
  }

  const { error } = await empleadosRpc(supabase).upsertEmpleado({
    legajo,
    nombreCompleto,
    categoriaCodigo,
    areaId,
    sectorId,
    procesoId,
    estado,
  })

  if (!error) revalidatePath('/admin/empleados')
  return { error: error?.message ?? '' }
}

// Fila del Excel: columnas por NOMBRE (Legajo, Nombre completo, Categoría,
// Área, Sector, Proceso, Estado) — rpc_importar_empleado_excel (0033)
// resuelve área/sector/proceso por nombre del lado de la base. Esta la
// sigue llamando ImportarExcelGenerico con un objeto ya armado (no
// FormData), porque ese componente no arma un <form> por fila — procesa
// un array en memoria fila por fila.
export async function importarFilaEmpleado(valores: Record<string, any>) {
  const supabase = await createClient()
  const { error } = await empleadosRpc(supabase).importarEmpleadoExcel({
    legajo: String(valores.legajo ?? ''),
    nombreCompleto: String(valores.nombreCompleto ?? ''),
    categoriaCodigo: String(valores.categoriaCodigo ?? ''),
    areaNombre: String(valores.areaNombre ?? ''),
    sectorNombre: String(valores.sectorNombre ?? ''),
    procesoNombre: String(valores.procesoNombre ?? ''),
    estado: String(valores.estado ?? 'ACTIVO').toUpperCase(),
  })

  if (!error) revalidatePath('/admin/empleados')
  return { error: error?.message }
}

export async function fusionarEmpleadosAction(conservarId: string, fusionarId: string) {
  const supabase = await createClient()
  const { error } = await empleadosRpc(supabase).fusionarEmpleados(conservarId, fusionarId)

  if (!error) revalidatePath('/admin/empleados')
  return { error: error?.message }
}

export async function eliminarEmpleadoAction(empleadoId: string) {
  const supabase = await createClient()
  const { data, error } = await empleadosRpc(supabase).eliminarOInactivarEmpleado(empleadoId)

  if (!error) revalidatePath('/admin/empleados')
  return { error: error?.message, accionRealizada: data?.accion_realizada, mensaje: data?.mensaje }
}