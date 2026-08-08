import { createClient } from '@/lib/supabase/server'
import { AdminEntityCrud, type CampoAdmin } from '@/components/admin/admin-entity-crud'
import { guardarMotivo } from './actions'

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
      <h1 className="text-lg font-semibold">Motivos</h1>
      <p className="text-sm text-slate-500">
        Los motivos con <strong>&quot;Requiere aprobación&quot; desactivado</strong> autoaprueban y cierran la
        solicitud apenas se agrega el primer empleado.
      </p>
      <AdminEntityCrud campos={CAMPOS} filas={data ?? []} onGuardar={guardarMotivo} />
    </div>
  )
}
