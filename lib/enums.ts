// Reflejan 1:1 los ENUM creados en 0001_tipos_extensiones.sql.
// Cuando corras `supabase gen types typescript` (ver README-FASE3.md) estos
// mismos valores van a aparecer dentro de Database['public']['Enums'] — este
// archivo es la referencia rápida mientras armamos las pantallas.

export const NIVEL_PERMISO = ['TODO', 'AREA', 'SECTOR', 'PROCESO', 'NADA'] as const
export type NivelPermiso = (typeof NIVEL_PERMISO)[number]

export const ESTADO_SOLICITUD = ['PENDIENTE', 'ABIERTA', 'CERRADA', 'ELIMINADA'] as const
export type EstadoSolicitud = (typeof ESTADO_SOLICITUD)[number]

export const ESTADO_EMPLEADO_APROBACION = ['PENDIENTE_APROBACION', 'APROBADO', 'RECHAZADO'] as const
export type EstadoEmpleadoAprobacion = (typeof ESTADO_EMPLEADO_APROBACION)[number]

export const ESTADO_EMPLEADO = ['ACTIVO', 'INACTIVO'] as const
export type EstadoEmpleado = (typeof ESTADO_EMPLEADO)[number]

export const TIPO_MOTIVO = ['PRODUCTIVO', 'IMPRODUCTIVO'] as const
export type TipoMotivo = (typeof TIPO_MOTIVO)[number]

// Etiquetas para mostrar en UI (badges, selects) sin ensuciar el resto del código.
export const ESTADO_SOLICITUD_LABEL: Record<EstadoSolicitud, string> = {
  PENDIENTE: 'Pendiente',
  ABIERTA: 'Abierta',
  CERRADA: 'Cerrada',
  ELIMINADA: 'Eliminada',
}

export const ESTADO_EMPLEADO_APROBACION_LABEL: Record<EstadoEmpleadoAprobacion, string> = {
  PENDIENTE_APROBACION: 'Pendiente de aprobación',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
}
