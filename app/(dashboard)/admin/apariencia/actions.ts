'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { TOKENS_POR_DEFECTO } from '@/lib/theme/tokens'

// Mismo patrón que el resto del proyecto: verificar fn_es_admin() con el
// cliente NORMAL antes de hacer cualquier escritura. Acá ni siquiera hace
// falta service_role — la RLS de 0038 (tabla y Storage) ya autoriza al
// admin autenticado directamente vía el cliente normal.
async function requireAdmin() {
  const supabase = await createClient()
  const { data: esAdmin } = await supabase.rpc('fn_es_admin')
  if (!esAdmin) {
    throw new Error('No tenés permisos de administrador')
  }
  return supabase
}

const REGEX_HEX = /^#[0-9A-Fa-f]{6}$/

export type ValoresApariencia = {
  nombreEmpresa: string
  temaPredeterminado: 'CLARO' | 'OSCURO' | 'SISTEMA'
  colorPrimario: string
  colorPrimarioHover: string
  colorSecundario: string
  colorAcento: string
  colorExito: string
  colorAdvertencia: string
  colorError: string
}

function validar(valores: ValoresApariencia): string | null {
  if (!valores.nombreEmpresa.trim()) return 'El nombre de la empresa es obligatorio'

  const colores = [
    valores.colorPrimario,
    valores.colorPrimarioHover,
    valores.colorSecundario,
    valores.colorAcento,
    valores.colorExito,
    valores.colorAdvertencia,
    valores.colorError,
  ]
  if (colores.some((c) => !REGEX_HEX.test(c))) {
    return 'Alguno de los colores no tiene un formato HEX válido (ej: #2563EB)'
  }
  return null
}

export async function actualizarApariencia(valores: ValoresApariencia) {
  const supabase = await requireAdmin()

  const errorValidacion = validar(valores)
  if (errorValidacion) return { error: errorValidacion }

  const { data: userData } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('configuracion_apariencia')
    .update({
      nombre_empresa: valores.nombreEmpresa.trim(),
      tema_predeterminado: valores.temaPredeterminado,
      color_primario: valores.colorPrimario,
      color_primario_hover: valores.colorPrimarioHover,
      color_secundario: valores.colorSecundario,
      color_acento: valores.colorAcento,
      color_exito: valores.colorExito,
      color_advertencia: valores.colorAdvertencia,
      color_error: valores.colorError,
      updated_by: userData.user?.id,
    })
    .eq('id', 1)

  // El tema/colores se leen en CADA request desde el layout raíz (sin
  // fetch-cache de por medio — ver análisis Fase A punto 8), así que en la
  // práctica esto ya alcanzaría solo. revalidatePath es una garantía
  // barata y explícita además, con el mismo mecanismo que usa todo el
  // proyecto.
  if (!error) revalidatePath('/', 'layout')

  return { error: error?.message }
}

// Restaura colores/tema/nombre a los valores de lib/theme/tokens.ts — el
// logo NO se borra acá (son acciones conceptualmente distintas); si
// también se quiere sacar el logo, está el botón "Eliminar logo" aparte.
export async function restaurarApariencia() {
  return actualizarApariencia({
    nombreEmpresa: TOKENS_POR_DEFECTO.nombreEmpresa,
    temaPredeterminado: TOKENS_POR_DEFECTO.temaPredeterminado,
    colorPrimario: TOKENS_POR_DEFECTO.colorPrimario,
    colorPrimarioHover: TOKENS_POR_DEFECTO.colorPrimarioHover,
    colorSecundario: TOKENS_POR_DEFECTO.colorSecundario,
    colorAcento: TOKENS_POR_DEFECTO.colorAcento,
    colorExito: TOKENS_POR_DEFECTO.colorExito,
    colorAdvertencia: TOKENS_POR_DEFECTO.colorAdvertencia,
    colorError: TOKENS_POR_DEFECTO.colorError,
  })
}

const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const TAMANO_MAXIMO = 5 * 1024 * 1024 // 5 MB

export async function subirLogo(formData: FormData) {
  const supabase = await requireAdmin()

  const archivo = formData.get('archivo') as File | null
  if (!archivo || archivo.size === 0) return { error: 'No se seleccionó ningún archivo' }
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return { error: 'Formato no permitido — usá PNG, JPG, WEBP o SVG' }
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return { error: 'El archivo supera los 5 MB permitidos' }
  }

  // Nombre generado por el sistema (nunca el nombre original del archivo
  // que suba el usuario) — evita cualquier riesgo de nombre de archivo
  // peligroso, y garantiza que siempre hay un único logo activo.
  const extension = archivo.type.split('/')[1].replace('svg+xml', 'svg')
  const path = `logo.${extension}`

  const { data: configActual } = await supabase.from('configuracion_apariencia').select('logo_path').eq('id', 1).maybeSingle()

  const { error: errorSubida } = await supabase.storage
    .from('branding')
    .upload(path, archivo, { upsert: true, contentType: archivo.type });

  if (errorSubida) return { error: errorSubida.message }

  // Si el logo anterior tenía otra extensión (el upsert de arriba no lo
  // pisó porque el path es distinto), lo borramos para no dejar archivos
  // huérfanos en el bucket.
  if (configActual?.logo_path && configActual.logo_path !== path) {
    await supabase.storage.from('branding').remove([configActual.logo_path])
  }

  const { data: userData } = await supabase.auth.getUser()
  const { error: errorUpdate } = await supabase
    .from('configuracion_apariencia')
    .update({
      logo_bucket: 'branding',
      logo_path: path,
      logo_actualizado_en: new Date().toISOString(),
      updated_by: userData.user?.id,
    })
    .eq('id', 1)

  if (errorUpdate) return { error: errorUpdate.message }

  revalidatePath('/', 'layout')
  return { error: undefined }
}

export async function eliminarLogo() {
  const supabase = await requireAdmin()

  const { data: config } = await supabase.from('configuracion_apariencia').select('logo_bucket, logo_path').eq('id', 1).maybeSingle()

  if (config?.logo_bucket && config?.logo_path) {
    await supabase.storage.from(config.logo_bucket).remove([config.logo_path])
  }

  const { error } = await supabase
    .from('configuracion_apariencia')
    .update({ logo_bucket: null, logo_path: null, logo_actualizado_en: null })
    .eq('id', 1)

  if (!error) revalidatePath('/', 'layout')
  return { error: error?.message }
}
