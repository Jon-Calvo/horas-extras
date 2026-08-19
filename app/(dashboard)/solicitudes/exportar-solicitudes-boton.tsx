'use client'

import { useTransition } from 'react'
import { exportarSolicitudesDetalladoAction, type FiltrosSolicitudes } from './actions'

// Arma un libro de 2 hojas (Opción B — ver README-FASE7-4-ANALISIS.md):
// Hoja 1 "Solicitudes" (una fila por solicitud, totales correctos) y Hoja
// 2 "Detalle empleados" (una fila por empleado, con "Número Solicitud"
// como columna de enlace). Evita el doble conteo que tendría una única
// hoja plana repitiendo horas/importe de la solicitud por cada empleado.
export function ExportarSolicitudesBoton({ filtros }: { filtros: FiltrosSolicitudes }) {
  const [pending, startTransition] = useTransition()

  function exportar() {
    startTransition(async () => {
      const result = await exportarSolicitudesDetalladoAction(filtros)
      if (result.error) {
        alert(`Error al exportar: ${result.error}`)
        return
      }
      if (!result.solicitudes || result.solicitudes.length === 0) {
        alert('No hay solicitudes para exportar con los filtros actuales')
        return
      }

      const XLSX = await import('xlsx')

      const hojaSolicitudes = (result.solicitudes ?? []).map((s: any) => ({
        Número: s.numero,
        Estado: s.estado_solicitud,
        Solicitante: s.solicitante_nombre,
        Área: s.area_nombre,
        Sector: s.sector_nombre,
        Proceso: s.proceso_nombre,
        Motivo: s.motivo_nombre,
        Inicio: s.fecha_hora_inicio,
        Fin: s.fecha_hora_fin,
        Empleados: s.cantidad_empleados,
        Horas: Number(s.total_horas_solicitud),
        Importe: Number(s.total_importe_solicitud),
        Moneda: s.moneda,
      }))

      const hojaDetalle = (result.empleados ?? []).map((e: any) => ({
        'Número Solicitud': e.numero_solicitud,
        Legajo: e.legajo,
        Nombre: e.nombre_completo,
        IB: e.ib_descripcion,
        'Ranking (al solicitar)': e.ranking_horas_al_momento,
        Estado: e.estado_aprobacion,
        Horas: Number(e.total_horas),
        Importe: Number(e.total_importe),
        Ingreso: e.fecha_hora_ingreso ?? '',
      }))

      const libro = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(hojaSolicitudes), 'Solicitudes')
      XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(hojaDetalle), 'Detalle empleados')
      XLSX.writeFile(libro, `solicitudes-detallado-${new Date().toISOString().slice(0, 10)}.xlsx`)
    })
  }

  return (
    <button type="button" onClick={exportar} disabled={pending} className="rounded border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-text/5 disabled:opacity-50">
      {pending ? 'Exportando...' : 'Exportar detallado'}
    </button>
  )
}
