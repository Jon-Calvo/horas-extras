// Reflejan 1:1 los ENUM creados en 0001_tipos_extensiones.sql.
// Cuando corras `supabase gen types typescript` estos mismos valores
// van a aparecer dentro de Database['public']['Enums'].

export const NIVEL_PERMISO = [
  'TODO',
  'AREA',
  'SECTOR',
  'PROCESO',
  'NADA',
] as const

export type NivelPermiso = (typeof NIVEL_PERMISO)[number]

export const ESTADO_SOLICITUD = [
  'PENDIENTE',
  'ABIERTA',
  'CERRADA',
  'ELIMINADA',
] as const

export type EstadoSolicitud = (typeof ESTADO_SOLICITUD)[number]

export const ESTADO_EMPLEADO_APROBACION = [
  'PENDIENTE_APROBACION',
  'APROBADO',
  'RECHAZADO',
] as const

export type EstadoEmpleadoAprobacion =
  (typeof ESTADO_EMPLEADO_APROBACION)[number]

export const ESTADO_EMPLEADO = [
  'ACTIVO',
  'INACTIVO',
] as const

export type EstadoEmpleado = (typeof ESTADO_EMPLEADO)[number]

export const TIPO_MOTIVO = [
  'PRODUCTIVO',
  'IMPRODUCTIVO',
] as const

export type TipoMotivo = (typeof TIPO_MOTIVO)[number]

// ============================================================
// Helpers de validación
// ============================================================

/**
 * Devuelve true si el valor corresponde a un EstadoSolicitud válido.
 *
 * Es especialmente útil para valores provenientes de:
 * - searchParams
 * - FormData
 * - vistas de Supabase
 * - importaciones futuras desde Excel
 */
export function esEstadoSolicitud(
  valor: string | null | undefined,
): valor is EstadoSolicitud {
  return (
    valor !== null &&
    valor !== undefined &&
    (ESTADO_SOLICITUD as readonly string[]).includes(valor)
  )
}

/**
 * Convierte un valor externo en EstadoSolicitud.
 *
 * Devuelve null cuando el valor no corresponde a ningún estado válido.
 */
export function parseEstadoSolicitud(
  valor: string | null | undefined,
): EstadoSolicitud | null {
  return esEstadoSolicitud(valor) ? valor : null
}

/**
 * Igual que esEstadoSolicitud/parseEstadoSolicitud pero para EstadoEmpleado
 * (ACTIVO/INACTIVO) — útil para valores provenientes de FormData.
 */
export function esEstadoEmpleado(
  valor: string | null | undefined,
): valor is EstadoEmpleado {
  return (
    valor !== null &&
    valor !== undefined &&
    (ESTADO_EMPLEADO as readonly string[]).includes(valor)
  )
}

export function parseEstadoEmpleado(
  valor: string | null | undefined,
): EstadoEmpleado | null {
  return esEstadoEmpleado(valor) ? valor : null
}

// ============================================================
// Etiquetas para mostrar en UI
// ============================================================

export const ESTADO_SOLICITUD_LABEL: Record<
  EstadoSolicitud,
  string
> = {
  PENDIENTE: 'Pendiente',
  ABIERTA: 'Abierta',
  CERRADA: 'Cerrada',
  ELIMINADA: 'Eliminada',
}

export const ESTADO_EMPLEADO_APROBACION_LABEL: Record<
  EstadoEmpleadoAprobacion,
  string
> = {
  PENDIENTE_APROBACION: 'Pendiente de aprobación',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
}
