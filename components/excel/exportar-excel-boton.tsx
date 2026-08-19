'use client'

import type { CampoAdmin } from '../admin/admin-entity-crud'

// Genera el archivo enteramente en el navegador a partir de los datos que
// la pantalla ya tiene cargados (no hace un roundtrip al servidor — los
// `filas` ya vinieron en el Server Component). Reusa la misma lista de
// `campos` que ya define cada pantalla para su tabla/formulario, así el
// Excel exportado tiene exactamente las mismas columnas con las mismas
// etiquetas legibles, sin mantener un mapeo aparte.
export function ExportarExcelBoton<T extends Record<string, any>>({
  campos,
  filas,
  nombreArchivo,
}: {
  campos: CampoAdmin[]
  filas: T[]
  nombreArchivo: string
}) {
  async function exportar() {
    const XLSX = await import('xlsx')

    const datos = filas.map((fila) =>
      Object.fromEntries(
        campos.map((c) => {
          const valor = fila[c.key]
          const valorLegible = c.type === 'checkbox' ? (valor ? 'Sí' : 'No') : (valor ?? '')
          return [c.label, valorLegible]
        })
      )
    )

    const hoja = XLSX.utils.json_to_sheet(datos)
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Datos')
    XLSX.writeFile(libro, `${nombreArchivo}.xlsx`)
  }

  return (
    <button type="button" onClick={exportar} className="rounded border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-text/5">
      Exportar Excel
    </button>
  )
}
