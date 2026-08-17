'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// Todas las acciones de este archivo tocan auth.users (vía service_role) o
// datos sensibles (permisos). Verificamos fn_es_admin() con el cliente
// NORMAL (respeta RLS, usa la sesión real del que llama) antes de tocar
// nada con el cliente de service_role — nunca al revés.
async function requireAdmin() {
  const supabase = await createClient()
  const { data: esAdmin } = await supabase.rpc('fn_es_admin')
  if (!esAdmin) {
    throw new Error('No tenés permisos de administrador')
  }
  return supabase
}

const ROLES_VALIDOS = [
  'ADMIN',
  'RESPONSABLE',
  'APROBADOR',
  'CONTROL_INGRESO',
  'CONSULTA',
] as const

type NivelPermiso = 'TODO' | 'AREA' | 'SECTOR' | 'PROCESO' | 'NADA'

function leerNivelPermiso(valor: FormDataEntryValue | null): NivelPermiso {
  const nivel = String(valor ?? 'NADA')

  if (
    nivel === 'TODO' ||
    nivel === 'AREA' ||
    nivel === 'SECTOR' ||
    nivel === 'PROCESO' ||
    nivel === 'NADA'
  ) {
    return nivel
  }

  return 'NADA'
}

function leerPermisosDeFormData(formData: FormData) {
  return {
    visibilidad_nivel: leerNivelPermiso(formData.get('visibilidadNivel')),
    aprobacion_nivel: leerNivelPermiso(formData.get('aprobacionNivel')),
    modificacion_nivel: leerNivelPermiso(formData.get('modificacionNivel')),
    reapertura_nivel: leerNivelPermiso(formData.get('reaperturaNivel')),
    control_ingreso: formData.get('controlIngreso') === 'on',
  }
}

function leerRolesDeFormData(formData: FormData) {
  return formData
    .getAll('roles')
    .map(String)
    .filter((r): r is (typeof ROLES_VALIDOS)[number] =>
      ROLES_VALIDOS.includes(r as (typeof ROLES_VALIDOS)[number])
    )
}

// ----------------------------------------------------------------------------
// IMPORTANTE — por qué el firma (prevState, formData): así se pasa DIRECTO
// como prop a un Client Component (`<UsuarioForm action={crearUsuario} />`)
// y se usa con `useActionState` + `<form action={...}>` nativo. Antes se
// envolvía en un arrow function inline (`onGuardar={(v) => crearUsuario(v)}`)
// para transformar el shape de datos — eso es exactamente lo que rompe:
// esa arrow function ya NO es una referencia a una Server Action real, es
// un closure nuevo, y Next.js la trata como "pasame un event handler común",
// que no se puede cruzar del Server Component al Client Component. La
// referencia cruda a la función exportada (o un `.bind()` de ella) SÍ se
// puede pasar — por eso acá se lee todo directo desde FormData en vez de
// pedir un objeto ya armado.
// ----------------------------------------------------------------------------

export async function crearUsuario(_prevState: { error: string }, formData: FormData): Promise<{ error: string }> {
  await requireAdmin()

  const nombreCompleto = String(formData.get('nombreCompleto') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const passwordInicial = String(formData.get('passwordInicial') ?? '')
  const areaId = (formData.get('areaId') as string) || null
  const sectorId = (formData.get('sectorId') as string) || null
  const procesoId = (formData.get('procesoId') as string) || null
  const roles = leerRolesDeFormData(formData)
  const permisos = leerPermisosDeFormData(formData)

  if (!nombreCompleto || !email) return { error: 'Nombre y email son obligatorios' }
  if (passwordInicial.length < 8) return { error: 'La contraseña inicial debe tener al menos 8 caracteres' }

  const admin = createServiceRoleClient()

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: passwordInicial,
    email_confirm: true, // el usuario entra directo, no depende de que confirme el mail
  })

  if (authError || !authUser.user) {
    return { error: authError?.message ?? 'No se pudo crear el usuario en Supabase Auth' }
  }

  const userId = authUser.user.id

  const { error: usuarioError } = await admin.from('usuarios').insert({
    id: userId,
    nombre_completo: nombreCompleto,
    email,
    area_id: areaId,
    sector_id: sectorId,
    proceso_id: procesoId,
    activo: true,
  })

  if (usuarioError) {
    // Rollback manual: si falla el insert en `usuarios`, no dejamos un
    // usuario de Auth huérfano sin fila correspondiente.
    await admin.auth.admin.deleteUser(userId)
    return { error: usuarioError.message }
  }

  await admin.from('usuario_permisos').insert({ usuario_id: userId, ...permisos })

  if (roles.length > 0) {
    const { data: rolesRows } = await admin.from('roles').select('id, nombre').in('nombre', roles)
    if (rolesRows && rolesRows.length > 0) {
      await admin.from('usuario_roles').insert(rolesRows.map((r) => ({ usuario_id: userId, rol_id: r.id })))
    }
  }

  revalidatePath('/admin/usuarios')
  redirect(`/admin/usuarios/${userId}`)
}

// El `id` se pre-aplica con `.bind(null, id)` en la página de edición —
// eso SÍ es una forma soportada de pasar una Server Action "con datos ya
// cargados" a un Client Component (a diferencia de envolverla en una arrow
// function nueva). El resultado de `.bind()` sigue siendo una referencia
// válida de Server Action.
export async function actualizarUsuario(
  id: string,
  _prevState: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const supabase = await requireAdmin()

  const nombreCompleto = String(formData.get('nombreCompleto') ?? '').trim()
  const areaId = (formData.get('areaId') as string) || null
  const sectorId = (formData.get('sectorId') as string) || null
  const procesoId = (formData.get('procesoId') as string) || null
  const roles = leerRolesDeFormData(formData)
  const permisos = leerPermisosDeFormData(formData)

  if (!nombreCompleto) return { error: 'El nombre es obligatorio' }

  const { error: usuarioError } = await supabase
    .from('usuarios')
    .update({ nombre_completo: nombreCompleto, area_id: areaId, sector_id: sectorId, proceso_id: procesoId })
    .eq('id', id)

  if (usuarioError) return { error: usuarioError.message }

  const { error: permisosError } = await supabase.from('usuario_permisos').upsert({ usuario_id: id, ...permisos })
  if (permisosError) return { error: permisosError.message }

  // Reemplazo simple de roles: borrar todos y volver a insertar los
  // seleccionados. Para la cantidad de roles que maneja este sistema (5
  // roles base) es más simple y menos propenso a bugs que un diff.
  await supabase.from('usuario_roles').delete().eq('usuario_id', id)
  if (roles.length > 0) {
    const { data: rolesRows } = await supabase.from('roles').select('id, nombre').in('nombre', roles)
    if (rolesRows && rolesRows.length > 0) {
      await supabase.from('usuario_roles').insert(rolesRows.map((r) => ({ usuario_id: id, rol_id: r.id })))
    }
  }

  revalidatePath('/admin/usuarios')
  revalidatePath(`/admin/usuarios/${id}`)
  return { error: '' }
}

// ---------- Estas tres NO se pasan como prop — el Client Component
// (acciones-cuenta.tsx) las importa y llama directo dentro de un
// onClick/startTransition. Ese patrón (llamar una Server Action como
// función desde código cliente) es distinto de "pasarla como prop" y no
// tiene el problema de arriba — por eso su firma se mantuvo simple.

export async function activarDesactivarUsuario(id: string, activo: boolean) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('usuarios').update({ activo }).eq('id', id)

  if (!error) {
    revalidatePath('/admin/usuarios')
    revalidatePath(`/admin/usuarios/${id}`)
  }

  return { error: error?.message }
}

export async function establecerPasswordTemporal(usuarioId: string, passwordTemporal: string) {
  await requireAdmin()

  if (passwordTemporal.length < 8) {
    return { error: 'La contraseña temporal debe tener al menos 8 caracteres' }
  }

  const admin = createServiceRoleClient()
  const { error } = await admin.auth.admin.updateUserById(usuarioId, { password: passwordTemporal })
  return { error: error?.message }
}

// FIX Fase 5.3 (punto E): antes no llevaba `redirectTo`, así que el enlace
// del email mandaba al usuario a la URL por defecto del proyecto de
// Supabase (sin ninguna pantalla para cargar la contraseña nueva) — el
// flujo no era usable en la práctica. Ahora apunta a /auth/confirm, que
// intercambia el token por una sesión real y recién ahí redirige a
// /reset-password (ver esos dos archivos nuevos).
export async function enviarEmailRecuperacion(email: string) {
  await requireAdmin()

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
  })
  return { error: error?.message }
}
