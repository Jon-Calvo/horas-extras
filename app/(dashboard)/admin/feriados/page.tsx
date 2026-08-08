import { createClient } from '@/lib/supabase/server'
import { AdminEntityCrud, type CampoAdmin } from '@/components/admin/admin-entity-crud'
import { eliminarFeriado, guardarFeriado } from './actions'

const CAMPOS: CampoAdmin[] = [
  { key: 'fecha', label: 'Fecha', type: 'date' },
  { key: 'descripcion', label: 'Descripción', type: 'text' },
]

export default async function FeriadosPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('feriados').select('*').order('fecha')

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Feriados</h1>
      <AdminEntityCrud campos={CAMPOS} filas={data ?? []} onGuardar={guardarFeriado} onEliminar={eliminarFeriado} />
    </div>
  )
}
