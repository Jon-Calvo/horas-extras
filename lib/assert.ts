// Reemplaza los `campo!` sueltos que hubo que agregar para compilar contra
// los tipos generados por Supabase (las vistas devuelven `string | null`
// aunque, por los INNER JOIN con los que están armadas en 0019/0020, esos
// campos nunca van a ser null en la práctica). La diferencia con `!`: si
// alguna vez cambia la vista (ej: se vuelve un LEFT JOIN) y el campo sí
// llega null, esto tira un error claro en vez de dejar pasar un `null`
// disfrazado de `string` silenciosamente hasta romper algo más abajo.
export function requireNonNull<T>(valor: T | null | undefined, campo: string): T {
  if (valor === null || valor === undefined) {
    throw new Error(`Se esperaba que "${campo}" no fuera null (revisar el JOIN de la vista en Postgres)`)
  }
  return valor
}

// FormData.get() devuelve `FormDataEntryValue | null` (string | File | null).
// Los <select>/<input> de texto siempre mandan string, pero castear
// directo `as string` no lo garantiza (y silenciaría el caso File). Este
// helper valida el tipo en runtime en vez de asumirlo.
export function leerCampoStringOpcional(formData: FormData, campo: string): string | null {
  const valor = formData.get(campo)
  return typeof valor === 'string' && valor !== '' ? valor : null
}
