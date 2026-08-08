import { createClient } from '@/lib/supabase/server'
import { AdminEntityCrud, type CampoAdmin } from '@/components/admin/admin-entity-crud'
import { guardarIb } from './actions'

const CAMPOS: CampoAdmin[] = [
  { key: 'descripcion', label: 'Descripción', type: 'text' },
  { key: 'ranking_inferior', label: 'Ranking desde', type: 'number', step: '0.01', min: '0' },
  { key: 'ranking_superior', label: 'Ranking hasta (vacío = sin tope)', type: 'number', step: '0.01', min: '0' },
  { key: 'activo', label: 'Activo', type: 'checkbox' },
]

export default async function IbPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('ib_configuracion').select('*').order('ranking_inferior')

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">IB (bandas de ranking)</h1>
      <p className="text-sm text-slate-500">
        Los rangos no pueden superponerse — el sistema los usa para calcular automáticamente el IB de cada empleado
        según su ranking de horas.
      </p>
      <AdminEntityCrud campos={CAMPOS} filas={data ?? []} onGuardar={guardarIb} />
    </div>
  )
}