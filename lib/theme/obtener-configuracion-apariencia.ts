import { createClient } from '@/lib/supabase/server'
import { CONFIGURACION_APARIENCIA_POR_DEFECTO, type ConfiguracionApariencia } from './tokens'

// Se puede llamar desde CUALQUIER Server Component, con o sin sesión — la
// policy de 0038 da SELECT también a 'anon' (necesario para el login).
export async function obtenerConfiguracionApariencia(): Promise<ConfiguracionApariencia> {
  const supabase = await createClient()
  const { data } = await supabase.from('configuracion_apariencia').select('*').eq('id', 1).maybeSingle()

  if (!data) {
    // No debería pasar (la fila se crea en la migración), pero si por algún
    // motivo no está, no rompemos el layout — servimos los defaults.
    return CONFIGURACION_APARIENCIA_POR_DEFECTO
  }

  let logoUrl: string | null = null
  if (data.logo_bucket && data.logo_path) {
    const { data: urlData } = supabase.storage.from(data.logo_bucket).getPublicUrl(data.logo_path)
    logoUrl = urlData.publicUrl
  }

  return {
    nombreEmpresa: data.nombre_empresa,
    temaPredeterminado: data.tema_predeterminado,
    colorPrimario: data.color_primario,
    colorPrimarioHover: data.color_primario_hover,
    colorSecundario: data.color_secundario,
    colorAcento: data.color_acento,
    colorExito: data.color_exito,
    colorAdvertencia: data.color_advertencia,
    colorError: data.color_error,
    logoUrl,
  }
}
