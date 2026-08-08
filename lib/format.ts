// Centraliza el timezone en un solo lugar. Postgres guarda todo en UTC
// (correcto — timestamptz), pero mostrarlo con `.toLocaleString('es-AR')`
// sin especificar `timeZone` toma el huso del entorno donde CORRE el
// código, no el de Argentina — en un Server Component eso es el huso del
// servidor (Vercel = UTC por defecto), no el del usuario. Por eso todas las
// pantallas deben pasar por acá en vez de llamar toLocaleString directo.
const TIME_ZONE = 'America/Argentina/Buenos_Aires'

export function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Para columnas `date` de Postgres (ej: vigencia_desde/vigencia_hasta), que
// llegan como "2026-07-01" SIN componente de hora. Pasar ese string por
// `new Date(...)` lo interpreta como medianoche UTC, y convertirlo después a
// America/Argentina/Buenos_Aires (UTC-3) lo corre al día anterior (21:00 del
// día previo). Para fechas puras no hay timezone que aplicar: se
// reformatea el string directamente, sin pasar por Date.
export function formatFechaSolo(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.split('-')
  return `${dia}/${mes}/${anio}`
}

export function formatMoneda(valor: number, moneda?: string | null): string {
  return `${moneda ?? ''} ${valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim()
}
