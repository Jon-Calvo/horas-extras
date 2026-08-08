'use server'

import { createClient } from '@/lib/supabase/server'

export async function actualizarPasswordPropia(
  _prevState: { error: string; success: boolean },
  formData: FormData
): Promise<{ error: string; success: boolean }> {
  const password = String(formData.get('password') ?? '')
  const passwordConfirmacion = String(formData.get('passwordConfirmacion') ?? '')

  if (password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres', success: false }
  }
  if (password !== passwordConfirmacion) {
    return { error: 'Las contraseñas no coinciden', success: false }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  return { error: error?.message ?? '', success: !error }
}