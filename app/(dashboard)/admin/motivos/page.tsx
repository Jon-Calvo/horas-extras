import { createClient } from '@/lib/supabase/server'
import { AdminEntityCrud, type CampoAdmin } from '@/components/admin/admin-entity-crud'
import { ExportarExcelBoton } from '@/components/excel/exportar-excel-boton'
import { ImportarExcelGenerico } from '@/components/excel/importar-excel-generico'
import { guardarMotivo, importarMotivo } from './actions'

const CAMPOS: CampoAdmin[] = [
  { key: 'motivo', label: 'Motivo', type: 'text' },
  {
    key: 'tipo',
    label: 'Tipo',
    type: 'select',
    opciones: [
      { value: 'PRODUCTIVO', label: 'Productivo' },
      { value: 'IMPRODUCTIVO', label: 'Improductivo' },
    ],
  },
  { key: 'requiere_aprobacion', label: 'Requiere aprobación', type: 'checkbox' },
  { key: 'activo', label: 'Activo', type: 'checkbox' },
]

export default async function MotivosPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('motivos').select('*').order('motivo')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Motivos</h1>
        <div className="flex gap-2">
          <ExportarExcelBoton campos={CAMPOS} filas={data ?? []} nombreArchivo="motivos" />
          <ImportarExcelGenerico campos={CAMPOS} onGuardarFila={importarMotivo} />
        </div>
      </div>
      <p className="text-sm text-text-muted">
        Los motivos con <strong>&quot;Requiere aprobación&quot; desactivado</strong> autoaprueban y cierran la
        solicitud apenas se agrega el primer empleado.
      </p>
      <AdminEntityCrud campos={CAMPOS} filas={data ?? []} onGuardar={guardarMotivo} />
    </div>
  )
}
