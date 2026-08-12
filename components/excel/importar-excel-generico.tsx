'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CampoAdmin } from '../admin/admin-entity-crud'

type ResultadoFila = { fila: number; ok: boolean; mensaje: string }

// Reusa la misma lista de `campos` (para saber qué columnas esperar y cómo
// convertir cada valor) y la misma función `onGuardarFila` que ya usa cada
// pantalla para el alta manual — así una fila importada pasa exactamente
// por las mismas validaciones que si se hubiera cargado a mano una por una.
// Procesa TODAS las filas aunque alguna falle (no aborta el lote), y
// muestra el resultado fila por fila — mismo criterio que
// rpc_agregar_empleados_masivo.
export function ImportarExcelGenerico({
  campos,
  onGuardarFila,
  plantillaEjemplo,
}: {
  campos: CampoAdmin[]
  onGuardarFila: (valores: Record<string, any>) => Promise<{ error?: string }>
  /** Fila de ejemplo para el botón "Descargar plantilla" (opcional). */
  plantillaEjemplo?: Record<string, string>
}) {
  const [abierto, setAbierto] = useState(false)
  const [filasPreview, setFilasPreview] = useState<Record<string, any>[] | null>(null)
  const [pending, startTransition] = useTransition()
  const [resultados, setResultados] = useState<ResultadoFila[] | null>(null)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const router = useRouter()

  function convertirValor(campo: CampoAdmin, valorCrudo: unknown): unknown {
    if (valorCrudo === undefined || valorCrudo === null || valorCrudo === '') return campo.type === 'checkbox' ? false : ''

    if (campo.type === 'checkbox') {
      const texto = String(valorCrudo).trim().toLowerCase()
      return ['sí', 'si', 'true', '1', 'x'].includes(texto)
    }
    if (campo.type === 'number') {
      return Number(valorCrudo)
    }
    if (campo.type === 'date' && valorCrudo instanceof Date) {
      // XLSX con cellDates:true devuelve objetos Date — normalizamos a
      // YYYY-MM-DD sin pasar por timezone (evita el mismo corrimiento de
      // día que ya documentamos en lib/format.ts para columnas `date`).
      const y = valorCrudo.getFullYear()
      const m = String(valorCrudo.getMonth() + 1).padStart(2, '0')
      const d = String(valorCrudo.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    return String(valorCrudo).trim()
  }

  async function onArchivoSeleccionado(file: File) {
    setErrorArchivo(null)
    setResultados(null)
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const libro = XLSX.read(buffer, { cellDates: true })
      const hoja = libro.Sheets[libro.SheetNames[0]]
      const filasCrudas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '' })

      if (filasCrudas.length === 0) {
        setErrorArchivo('El archivo no tiene filas de datos')
        return
      }

      const filas = filasCrudas.map((filaCruda) =>
        Object.fromEntries(campos.map((c) => [c.key, convertirValor(c, filaCruda[c.label])]))
      )
      setFilasPreview(filas)
    } catch (e) {
      setErrorArchivo('No se pudo leer el archivo. ¿Es un .xlsx válido?')
    }
  }

  function confirmarImportacion() {
    if (!filasPreview) return
    startTransition(async () => {
      const resultadosLocal: ResultadoFila[] = []
      for (let i = 0; i < filasPreview.length; i++) {
        const resultado = await onGuardarFila(filasPreview[i])
        resultadosLocal.push({ fila: i + 2, ok: !resultado.error, mensaje: resultado.error ?? 'Importado correctamente' }) // +2: fila 1 es el header
      }
      setResultados(resultadosLocal)
      setFilasPreview(null)
      router.refresh()
    })
  }

  async function descargarPlantilla() {
    const XLSX = await import('xlsx')
    const fila = plantillaEjemplo ?? Object.fromEntries(campos.map((c) => [c.label, '']))
    const hoja = XLSX.utils.json_to_sheet([fila])
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Plantilla')
    XLSX.writeFile(libro, 'plantilla-importacion.xlsx')
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="rounded border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
        Importar Excel
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Importar desde Excel</h3>
        <button type="button" onClick={() => setAbierto(false)} className="text-xs text-slate-500 underline">
          Cerrar
        </button>
      </div>

      <p className="text-xs text-slate-500">
        El archivo debe tener una fila de encabezado con estas columnas exactas: {campos.map((c) => c.label).join(', ')}.
      </p>
      <button type="button" onClick={descargarPlantilla} className="text-xs text-slate-500 underline">
        Descargar plantilla vacía
      </button>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => e.target.files?.[0] && onArchivoSeleccionado(e.target.files[0])}
        className="block w-full text-sm"
      />

      {errorArchivo && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{errorArchivo}</p>}

      {filasPreview && (
        <div className="space-y-2">
          <p className="text-sm">
            Se detectaron <strong>{filasPreview.length}</strong> filas. Revisá el preview antes de confirmar:
          </p>
          <div className="max-h-48 overflow-y-auto rounded border text-xs">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  {campos.map((c) => (
                    <th key={c.key} className="px-2 py-1 text-left">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filasPreview.slice(0, 10).map((fila, i) => (
                  <tr key={i} className="border-t">
                    {campos.map((c) => (
                      <td key={c.key} className="px-2 py-1">
                        {String(fila[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {filasPreview.length > 10 && <p className="p-2 text-slate-400">...y {filasPreview.length - 10} filas más</p>}
          </div>
          <button
            type="button"
            onClick={confirmarImportacion}
            disabled={pending}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {pending ? 'Importando...' : `Confirmar e importar ${filasPreview.length} filas`}
          </button>
        </div>
      )}

      {resultados && (
        <div className="space-y-1">
          <p className="text-sm font-medium">
            Resultado: {resultados.filter((r) => r.ok).length} de {resultados.length} filas importadas correctamente.
          </p>
          <ul className="max-h-40 space-y-0.5 overflow-y-auto text-xs">
            {resultados.map((r) => (
              <li key={r.fila} className={r.ok ? 'text-green-700' : 'text-red-700'}>
                Fila {r.fila}: {r.ok ? '✓' : '✗'} {r.mensaje}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
