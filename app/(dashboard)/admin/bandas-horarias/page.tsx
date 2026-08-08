import { createClient } from '@/lib/supabase/server'
import { AdminEntityCrud, type CampoAdmin } from '@/components/admin/admin-entity-crud'
import { guardarBandaHoraria } from './actions'

// dia_inicio/dia_fin en convención ISO (1=lunes...7=domingo) — igual que en
// fn_dia_en_rango (0014). No hay validación de superposición entre bandas en
// el ABM: el motor de cálculo ya resuelve superposiciones eligiendo la banda
// de rango horario más angosto (ver 0014), pero para evitar ambigüedad
// conviene configurar bandas sin superposición real.
const CAMPOS: CampoAdmin[] = [
  { key: 'descripcion', label: 'Descripción', type: 'text' },
  { key: 'dia_inicio', label: 'Día inicio (1=lun...7=dom)', type: 'number', min: '1' },
  { key: 'dia_fin', label: 'Día fin (1=lun...7=dom)', type: 'number', min: '1' },
  { key: 'hora_inicio', label: 'Hora inicio', type: 'time' },
  { key: 'hora_fin', label: 'Hora fin', type: 'time' },
  { key: 'factor_valor_hora', label: 'Factor', type: 'number', step: '0.01', min: '0' },
  { key: 'factor_feriado', label: 'Factor feriado', type: 'number', step: '0.01', min: '0' },
  { key: 'activo', label: 'Activo', type: 'checkbox' },
]

export default async function BandasHorariasPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('bandas_horarias').select('*').order('descripcion')

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Bandas horarias</h1>
      <AdminEntityCrud campos={CAMPOS} filas={data ?? []} onGuardar={guardarBandaHoraria} />
    </div>
  )
}
