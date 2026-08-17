import type { SupabaseClient } from '@supabase/supabase-js'

// Capa fina sobre supabase.rpc(...): un método por cada RPC realmente
// instalado en la base (ver el listado que confirmaste). Nada de lógica acá
// — toda la validación de negocio vive en Postgres (0016_rpc_negocio.sql).
// Esto es solo para tener autocompletado/tipos en vez de repetir
// supabase.rpc('nombre_a_mano', {...}) en cada componente.
//
// Uso típico en un Server Action o Route Handler:
//   const supabase = await createClient()
//   const rpc = solicitudesRpc(supabase)
//   const { data, error } = await rpc.crearSolicitud({ ... })

export function empleadosRpc(supabase: SupabaseClient) {
  return {
    upsertEmpleado: (args: {
      legajo: string
      nombreCompleto: string
      categoriaCodigo: string
      areaId: string | null
      sectorId: string | null
      procesoId: string | null
      estado?: 'ACTIVO' | 'INACTIVO'
    }) =>
      supabase.rpc('rpc_upsert_empleado', {
        p_legajo: args.legajo,
        p_nombre_completo: args.nombreCompleto,
        p_categoria_codigo: args.categoriaCodigo,
        p_area_id: args.areaId,
        p_sector_id: args.sectorId,
        p_proceso_id: args.procesoId,
        p_estado: args.estado ?? 'ACTIVO',
      }),

    importarEmpleadoExcel: (args: {
      legajo: string
      nombreCompleto: string
      categoriaCodigo: string
      areaNombre: string
      sectorNombre: string
      procesoNombre: string
      estado?: string
    }) =>
      supabase.rpc('rpc_importar_empleado_excel', {
        p_legajo: args.legajo,
        p_nombre_completo: args.nombreCompleto,
        p_categoria_codigo: args.categoriaCodigo,
        p_area_nombre: args.areaNombre || null,
        p_sector_nombre: args.sectorNombre || null,
        p_proceso_nombre: args.procesoNombre || null,
        p_estado: args.estado || 'ACTIVO',
      }),

    fusionarEmpleados: (conservarId: string, fusionarId: string) =>
      supabase.rpc('rpc_fusionar_empleados', { p_conservar_id: conservarId, p_fusionar_id: fusionarId }),

    eliminarOInactivarEmpleado: async (empleadoId: string) => {
      const { data, error } = await supabase.rpc('rpc_eliminar_o_inactivar_empleado', {
        p_empleado_id: empleadoId,
      })

      const resultado = data?.[0] ?? null

      return {
        data: resultado,
        error,
      }
    },
  }
}

export function maestrosRpc(supabase: SupabaseClient) {
  return {
    actualizarValorCategoria: (args: { categoriaTipoId: string; valorHora: number; moneda: string; vigenciaDesde: string }) =>
      supabase.rpc('rpc_actualizar_valor_categoria', {
        p_categoria_tipo_id: args.categoriaTipoId,
        p_valor_hora: args.valorHora,
        p_moneda: args.moneda,
        p_vigencia_desde: args.vigenciaDesde,
      }),
  }
}

export function solicitudesRpc(supabase: SupabaseClient) {
  return {
    crearSolicitud: (args: {
      areaId: string
      sectorId: string
      procesoId: string
      fechaHoraInicio: string   // ISO
      fechaHoraFin: string      // ISO
      motivoId: string
      observacion?: string | null
    }) =>
      supabase.rpc('rpc_crear_solicitud', {
        p_area_id: args.areaId,
        p_sector_id: args.sectorId,
        p_proceso_id: args.procesoId,
        p_fecha_hora_inicio: args.fechaHoraInicio,
        p_fecha_hora_fin: args.fechaHoraFin,
        p_motivo_id: args.motivoId,
        p_observacion: args.observacion ?? null,
      }),

    agregarEmpleado: (solicitudId: string, empleadoId: string) =>
      supabase.rpc('rpc_agregar_empleado', {
        p_solicitud_id: solicitudId,
        p_empleado_id: empleadoId,
      }),

    agregarEmpleadosMasivo: (solicitudId: string, empleadoIds: string[]) =>
      supabase.rpc('rpc_agregar_empleados_masivo', {
        p_solicitud_id: solicitudId,
        p_empleado_ids: empleadoIds,
      }),

    quitarEmpleado: (solicitudEmpleadoId: string) =>
      supabase.rpc('rpc_quitar_empleado', { p_solicitud_empleado_id: solicitudEmpleadoId }),

    recalcularEmpleado: (solicitudEmpleadoId: string) =>
      supabase.rpc('rpc_recalcular_empleado', { p_solicitud_empleado_id: solicitudEmpleadoId }),

    aprobarEmpleado: (solicitudEmpleadoId: string) =>
      supabase.rpc('rpc_aprobar_empleado', { p_solicitud_empleado_id: solicitudEmpleadoId }),

    rechazarEmpleado: (solicitudEmpleadoId: string) =>
      supabase.rpc('rpc_rechazar_empleado', { p_solicitud_empleado_id: solicitudEmpleadoId }),

    aprobarSolicitudCompleta: (solicitudId: string) =>
      supabase.rpc('rpc_aprobar_solicitud_completa', { p_solicitud_id: solicitudId }),

    rechazarSolicitudCompleta: (solicitudId: string) =>
      supabase.rpc('rpc_rechazar_solicitud_completa', { p_solicitud_id: solicitudId }),

    aprobacionMasiva: (solicitudIds: string[], accion: 'APROBAR' | 'RECHAZAR') =>
      supabase.rpc('rpc_aprobacion_masiva', { p_solicitud_ids: solicitudIds, p_accion: accion }),

    reabrirSolicitud: (solicitudId: string) =>
      supabase.rpc('rpc_reabrir_solicitud', { p_solicitud_id: solicitudId }),

    finalizarCarga: (solicitudId: string) =>
      supabase.rpc('rpc_finalizar_carga', { p_solicitud_id: solicitudId }),

    volverAPendiente: (solicitudId: string) =>
      supabase.rpc('rpc_volver_a_pendiente', { p_solicitud_id: solicitudId }),

    eliminarSolicitud: (solicitudId: string) =>
      supabase.rpc('rpc_eliminar_solicitud', { p_solicitud_id: solicitudId }),

    registrarControlIngreso: (solicitudEmpleadoId: string, fechaHoraIngreso?: string) =>
      supabase.rpc('rpc_registrar_control_ingreso', {
        p_solicitud_empleado_id: solicitudEmpleadoId,
        ...(fechaHoraIngreso ? { p_fecha_hora_ingreso: fechaHoraIngreso } : {}),
      }),

    registrarControlIngresoMasivo: (solicitudEmpleadoIds: string[], fechaHoraIngreso?: string) =>
      supabase.rpc('rpc_registrar_control_ingreso_masivo', {
        p_solicitud_empleado_ids: solicitudEmpleadoIds,
        ...(fechaHoraIngreso ? { p_fecha_hora_ingreso: fechaHoraIngreso } : {}),
      }),

    registrarControlIngresoSolicitud: (solicitudId: string, fechaHoraIngreso?: string) =>
      supabase.rpc('rpc_registrar_control_ingreso_solicitud', {
        p_solicitud_id: solicitudId,
        ...(fechaHoraIngreso ? { p_fecha_hora_ingreso: fechaHoraIngreso } : {}),
      }),

    eliminarControlIngreso: (solicitudEmpleadoId: string) =>
      supabase.rpc('rpc_eliminar_control_ingreso', { p_solicitud_empleado_id: solicitudEmpleadoId }),

    upsertEmpleado: (args: {
      legajo: string
      nombreCompleto: string
      categoriaCodigo: string
      areaId: string | null
      sectorId: string | null
      procesoId: string | null
      estado?: 'ACTIVO' | 'INACTIVO'
    }) =>
      supabase.rpc('rpc_upsert_empleado', {
        p_legajo: args.legajo,
        p_nombre_completo: args.nombreCompleto,
        p_categoria_codigo: args.categoriaCodigo,
        p_area_id: args.areaId,
        p_sector_id: args.sectorId,
        p_proceso_id: args.procesoId,
        p_estado: args.estado ?? 'ACTIVO',
      }),
  }
}