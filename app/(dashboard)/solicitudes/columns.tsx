'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { ESTADO_SOLICITUD_LABEL, type EstadoSolicitud } from '@/lib/enums'
import { formatFechaHora, formatMoneda } from '@/lib/format'

// Fila del modo "compacto" (ver enunciado original: número, solicitante,
// area/sector/proceso, fechas, horas, cantidad de empleados, importe total).
// Estos campos salen de una vista/consulta que arma Fase 5; acá solo se
// define cómo se muestran.
export type SolicitudRow = {
  id: string
  numero: string
  estadoSolicitud: EstadoSolicitud
  solicitanteNombre: string
  areaNombre: string
  sectorNombre: string
  procesoNombre: string | null
  motivoNombre: string
  fechaHoraInicio: string
  fechaHoraFin: string
  cantidadEmpleados: number
  totalHorasSolicitud: number
  totalImporteSolicitud: number
  moneda: string | null
}

const ESTADO_BADGE_CLASS: Record<EstadoSolicitud, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-800',
  ABIERTA: 'bg-blue-100 text-blue-800',
  CERRADA: 'bg-green-100 text-green-800',
  ELIMINADA: 'bg-slate-200 text-slate-500 line-through',
}

export const selectColumn: ColumnDef<SolicitudRow> = {
  id: 'select',
  header: ({ table }) => (
    <input
      type="checkbox"
      checked={table.getIsAllRowsSelected()}
      ref={(el) => {
        if (el) el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
      }}
      onChange={table.getToggleAllRowsSelectedHandler()}
    />
  ),
  cell: ({ row }) => {
    const aprobable = row.original.estadoSolicitud === 'ABIERTA'
    return (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        disabled={!aprobable}
        onChange={row.getToggleSelectedHandler()}
        title={aprobable ? undefined : 'Solo se pueden seleccionar solicitudes ABIERTA (carga finalizada)'}
      />
    )
  },
}

export const solicitudColumns: ColumnDef<SolicitudRow>[] = [
  {
    accessorKey: 'numero',
    header: 'Número',
    cell: ({ row }) => (
      <Link href={`/solicitudes/${row.original.id}`} className="font-medium text-slate-900 underline">
        {row.original.numero}
      </Link>
    ),
  },
  {
    accessorKey: 'estadoSolicitud',
    header: 'Estado',
    cell: ({ row }) => (
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE_CLASS[row.original.estadoSolicitud]}`}>
        {ESTADO_SOLICITUD_LABEL[row.original.estadoSolicitud]}
      </span>
    ),
  },
  { accessorKey: 'solicitanteNombre', header: 'Solicitante' },
  { accessorKey: 'areaNombre', header: 'Área' },
  { accessorKey: 'sectorNombre', header: 'Sector' },
  { accessorKey: 'procesoNombre', header: 'Proceso' },
  { accessorKey: 'motivoNombre', header: 'Motivo' },
  {
    accessorKey: 'fechaHoraInicio',
    header: 'Inicio',
    cell: ({ row }) => formatFechaHora(row.original.fechaHoraInicio),
  },
  {
    accessorKey: 'fechaHoraFin',
    header: 'Fin',
    cell: ({ row }) => formatFechaHora(row.original.fechaHoraFin),
  },
  { accessorKey: 'cantidadEmpleados', header: 'Empleados' },
  {
    accessorKey: 'totalHorasSolicitud',
    header: 'Horas',
    cell: ({ row }) => row.original.totalHorasSolicitud.toFixed(2),
  },
  {
    accessorKey: 'totalImporteSolicitud',
    header: 'Importe',
    cell: ({ row }) => formatMoneda(row.original.totalImporteSolicitud, row.original.moneda),
  },
]
