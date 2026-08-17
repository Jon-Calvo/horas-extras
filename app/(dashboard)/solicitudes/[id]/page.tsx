import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  ESTADO_SOLICITUD_LABEL,
  parseEstadoSolicitud,
} from '@/lib/enums'
import { formatFechaHora, formatMoneda } from '@/lib/format'
import { requireNonNull } from '@/lib/assert'
import {
  EmpleadosSolicitud,
  type EmpleadoDeSolicitud,
} from './empleados-solicitud'
import { AccionesSolicitud } from './acciones-solicitud'
import { AgregarEmpleadosPanel } from './agregar-empleados-panel'

export default async function SolicitudDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: solicitud } = await supabase
    .from('vista_solicitudes_resumen')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!solicitud) notFound()

  // ============================================================
  // Campos que sabemos que NO pueden ser null en la tabla base.
  // Las vistas de Supabase igualmente los tipan como string | null,
  // por lo que los validamos explícitamente.
  // ============================================================

  const solicitudId = requireNonNull(solicitud.id, 'id')
  const numeroSolicitud = requireNonNull(solicitud.numero, 'numero')

  const estadoSolicitud = parseEstadoSolicitud(
    solicitud.estado_solicitud,
  )

  if (!estadoSolicitud) {
    throw new Error(
      `Estado de solicitud inválido o NULL para la solicitud ${solicitudId}`,
    )
  }

  const areaId = requireNonNull(
    solicitud.area_id,
    'area_id',
  )

  const sectorId = requireNonNull(
    solicitud.sector_id,
    'sector_id',
  )

  const procesoId = requireNonNull(
    solicitud.proceso_id,
    'proceso_id',
  )

  const fechaHoraInicio = requireNonNull(
    solicitud.fecha_hora_inicio,
    'fecha_hora_inicio',
  )

  const fechaHoraFin = requireNonNull(
    solicitud.fecha_hora_fin,
    'fecha_hora_fin',
  )

  // ============================================================
  // Permisos y datos relacionados
  // ============================================================

  const [
    { data: empleadosRaw },
    { data: permisos },
    { data: areas },
    { data: sectores },
    { data: procesos },
    { data: ibs },
  ] = await Promise.all([
    supabase
      .from('vista_solicitud_empleados_detalle')
      .select('*')
      .eq('solicitud_id', id),

    supabase
      .rpc('fn_permisos_para_scope', {
        p_area_id: areaId,
        p_sector_id: sectorId,
        p_proceso_id: procesoId,
      })
      .maybeSingle(),

    supabase
      .from('areas')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre'),

    supabase
      .from('sectores')
      .select('id, nombre, area_id')
      .eq('activo', true)
      .order('nombre'),

    supabase
      .from('procesos')
      .select('id, nombre, sector_id')
      .eq('activo', true)
      .order('nombre'),

    supabase
      .from('ib_configuracion')
      .select('id, descripcion')
      .eq('activo', true)
      .order('ranking_inferior'),
  ])

  const puedeAprobar = Boolean(permisos?.puede_aprobar)
  const puedeModificar = Boolean(permisos?.puede_modificar)
  const puedeReabrir = Boolean(permisos?.puede_reabrir)
  const puedeControlIngreso = Boolean(
    permisos?.puede_control_ingreso,
  )

  // ============================================================
  // Empleados de la solicitud
  // ============================================================

  const empleados: EmpleadoDeSolicitud[] = (
    empleadosRaw ?? []
  ).map((e) => ({
    solicitudEmpleadoId: requireNonNull(
      e.solicitud_empleado_id,
      'solicitud_empleado_id',
    ),

    legajo: requireNonNull(
      e.legajo,
      'legajo',
    ),

    nombreCompleto: requireNonNull(
      e.nombre_completo,
      'nombre_completo',
    ),

    // Puede ser null legítimamente:
    // el empleado puede no tener IB asignado todavía.
    ibDescripcion: e.ib_descripcion,

    rankingHorasAlMomento:
      e.ranking_horas_al_momento,

    estadoAprobacion: requireNonNull(
      e.estado_aprobacion,
      'estado_aprobacion',
    ),

    totalHoras: Number(e.total_horas),

    totalImporte: Number(e.total_importe),

    // Puede ser null legítimamente:
    // todavía no se registró el ingreso.
    fechaHoraIngreso: e.fecha_hora_ingreso,

    puedeAprobar,
    puedeModificar,
    puedeControlIngreso,
  }))

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6">

      <div className="rounded-lg border bg-white p-6">

        <div className="flex items-start justify-between">

          <div>
            <h1 className="text-lg font-semibold">
              Solicitud {numeroSolicitud}
            </h1>

            <p className="text-sm text-slate-500">
              {solicitud.area_nombre} /{' '}
              {solicitud.sector_nombre}

              {solicitud.proceso_nombre
                ? ` / ${solicitud.proceso_nombre}`
                : ''}{' '}

              — {solicitud.solicitante_nombre}
            </p>
          </div>

          <span className="rounded bg-slate-100 px-3 py-1 text-sm font-medium">
            {ESTADO_SOLICITUD_LABEL[estadoSolicitud]}
          </span>

        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">

          <div>
            <dt className="text-slate-500">
              Motivo
            </dt>
            <dd>
              {solicitud.motivo_nombre}
            </dd>
          </div>

          <div>
            <dt className="text-slate-500">
              Inicio
            </dt>
            <dd>
              {formatFechaHora(fechaHoraInicio)}
            </dd>
          </div>

          <div>
            <dt className="text-slate-500">
              Fin
            </dt>
            <dd>
              {formatFechaHora(fechaHoraFin)}
            </dd>
          </div>

          <div>
            <dt className="text-slate-500">
              Importe total
            </dt>
            <dd>
              {formatMoneda(
                Number(solicitud.total_importe_solicitud),
                solicitud.moneda,
              )}
            </dd>
          </div>

        </dl>

        {solicitud.observacion && (
          <p className="mt-4 text-sm text-slate-600">
            {solicitud.observacion}
          </p>
        )}

      </div>

      <AccionesSolicitud
        solicitudId={solicitudId}
        estadoSolicitud={estadoSolicitud}
        puedeAprobar={puedeAprobar}
        puedeModificar={puedeModificar}
        puedeReabrir={puedeReabrir}
        puedeControlIngreso={puedeControlIngreso}
      />

      {puedeModificar &&
        estadoSolicitud === 'PENDIENTE' && (
          <AgregarEmpleadosPanel
            solicitudId={solicitudId}
            opciones={{
              areas: areas ?? [],

              sectores: (sectores ?? []).map(
                (s) => ({
                  id: s.id,
                  nombre: s.nombre,
                  areaId: s.area_id,
                }),
              ),

              procesos: (procesos ?? []).map(
                (p) => ({
                  id: p.id,
                  nombre: p.nombre,
                  sectorId: p.sector_id,
                }),
              ),

              ibs: ibs ?? [],
            }}
          />
        )}

      <EmpleadosSolicitud
        solicitudId={solicitudId}
        estadoSolicitud={estadoSolicitud}
        empleados={empleados}
        puedeModificarSolicitud={puedeModificar}
      />

    </div>
  )
}