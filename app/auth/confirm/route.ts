import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

// Patrón oficial de Supabase para App Router + @supabase/ssr: los enlaces
// de email (recuperación de contraseña, invitación, etc.) apuntan acá con
// `token_hash` + `type` en la querystring. Este Route Handler intercambia
// eso por una sesión real (seteando las cookies vía el cliente server),
// TODO server-side — recién después redirige a `next`. Si se saltara este
// paso y `resetPasswordForEmail` apuntara directo a /reset-password, esa
// pantalla nunca tendría sesión (el navegador no manda el token como
// cookie, y el fragment/query del email no alcanza para autenticar sin
// este intercambio).
const TIPOS_OTP_VALIDOS: EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]

function esEmailOtpType(valor: string | null): valor is EmailOtpType {
  return valor !== null && (TIPOS_OTP_VALIDOS as string[]).includes(valor)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const typeParam = searchParams.get('type')
  const type = esEmailOtpType(typeParam) ? typeParam : null
  const next = searchParams.get('next') ?? '/'

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      redirect(next)
    }
  }

  redirect(`/login?error=${encodeURIComponent('El enlace no es válido o ya expiró')}`)
}