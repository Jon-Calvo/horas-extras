import { createClient } from '@/lib/supabase/server'
import { ConfiguracionGeneralForm } from './configuracion-form'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('configuracion_general').select('*').eq('id', 1).single()

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Configuración general</h1>
      {data && <ConfiguracionGeneralForm inicial={data} />}
    </div>
  )
}