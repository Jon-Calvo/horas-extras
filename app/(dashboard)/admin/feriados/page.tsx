import { createClient } from '@/lib/supabase/server'
import { AdminEntityCrud, type CampoAdmin } from '@/components/admin/admin-entity-crud'
import { ExportarExcelBoton } from '@/components/excel/exportar-excel-boton'
import { ImportarExcelGenerico } from '@/components/excel/importar-excel-generico'
import { eliminarFeriado, guardarFeriado, importarFeriado,} from './actions'

const CAMPOS: CampoAdmin[] = [
  { key: 'fecha', label: 'Fecha', type: 'date' },
  { key: 'descripcion', label: 'Descripción', type: 'text' },
]

export default async function FeriadosPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('feriados').select('*').order('fecha')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Feriados</h1>
        <div className="flex gap-2">
          <ExportarExcelBoton campos={CAMPOS} filas={data ?? []} nombreArchivo="feriados" />
          <ImportarExcelGenerico
            campos={CAMPOS}
            onGuardarFila={importarFeriado}
            plantillaEjemplo={{ Fecha: '2026-12-25', Descripción: 'Navidad' }}
          />
        </div>
      </div>
      <AdminEntityCrud campos={CAMPOS} filas={data ?? []} onGuardar={guardarFeriado} onEliminar={eliminarFeriado} />
    </div>
  )
}
