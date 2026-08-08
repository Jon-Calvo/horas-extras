'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// El bloqueo de "no inactivar con dependencias" vive en triggers de Postgres
// (0031) — acá no se reimplementa esa lógica, solo se deja pasar el mensaje
// de la excepción tal cual (ya viene en español y es específico: "tiene
// sectores activos", "tiene usuarios asociados", etc.).

function mensajeAmigable(mensaje: string | undefined): string | undefined {
  if (mensaje?.includes('duplicate key value violates unique constraint')) {
    return 'Ya existe un registro con ese nombre en ese nivel'
  }
  return mensaje
}

// ---------------------------------------------------------------- Áreas ---
export async function guardarArea(id: string | null, nombre: string) {
  const supabase = await createClient()
  const payload = { nombre: nombre.trim() }

  const { error } = id
    ? await supabase.from('areas').update(payload).eq('id', id)
    : await supabase.from('areas').insert(payload)

  if (!error) revalidatePath('/admin/organizacion')
  return { error: mensajeAmigable(error?.message) }
}

export async function toggleActivoArea(id: string, activo: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('areas').update({ activo }).eq('id', id)

  if (!error) revalidatePath('/admin/organizacion')
  return { error: mensajeAmigable(error?.message) }
}

// -------------------------------------------------------------- Sectores --
export async function guardarSector(id: string | null, areaId: string, nombre: string) {
  const supabase = await createClient()
  const payload = { area_id: areaId, nombre: nombre.trim() }

  const { error } = id
    ? await supabase.from('sectores').update(payload).eq('id', id)
    : await supabase.from('sectores').insert(payload)

  if (!error) revalidatePath('/admin/organizacion')
  return { error: mensajeAmigable(error?.message) }
}

export async function toggleActivoSector(id: string, activo: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('sectores').update({ activo }).eq('id', id)

  if (!error) revalidatePath('/admin/organizacion')
  return { error: mensajeAmigable(error?.message) }
}

// -------------------------------------------------------------- Procesos --
export async function guardarProceso(id: string | null, sectorId: string, nombre: string) {
  const supabase = await createClient()
  const payload = { sector_id: sectorId, nombre: nombre.trim() }

  const { error } = id
    ? await supabase.from('procesos').update(payload).eq('id', id)
    : await supabase.from('procesos').insert(payload)

  if (!error) revalidatePath('/admin/organizacion')
  return { error: mensajeAmigable(error?.message) }
}

export async function toggleActivoProceso(id: string, activo: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('procesos').update({ activo }).eq('id', id)

  if (!error) revalidatePath('/admin/organizacion')
  return { error: mensajeAmigable(error?.message) }
}