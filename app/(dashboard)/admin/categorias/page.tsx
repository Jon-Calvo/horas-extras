import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminEntityCrud, type CampoAdmin } from '@/components/admin/admin-entity-crud'
import { guardarCategoriaTipo } from './actions'

const CAMPOS: CampoAdmin[] = [
  { key: 'codigo', label: 'Código', type: 'text' },
  { key: 'descripcion', label: 'Descripción', type: 'text' },
  { key: 'activo', label: 'Activo', type: 'checkbox' },
]

export default async function CategoriasPage() {
  const supabase = await createClient()

  const [{ data: tipos }, { data: valoresVigentes }] = await Promise.all([
    supabase.from('categoria_tipos').select('*').order('codigo'),
    supabase.from('categoria_valores').select('categoria_tipo_id, valor_hora, moneda').is('vigencia_hasta', null),
  ])

  const vigentePorTipo = new Map((valoresVigentes ?? []).map((v) => [v.categoria_tipo_id, v]))

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Categorías</h1>
      <p className="text-sm text-text-muted">
        El valor por hora está versionado por vigencia — para cambiarlo entrá al detalle de la categoría en vez de
        editarlo acá (esto solo edita el código/descripción/activo del tipo).
      </p>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-b-border bg-background text-left">
            <tr>
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2">Valor vigente</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(tipos ?? []).map((t) => {
              const vigente = vigentePorTipo.get(t.id)
              return (
                <tr key={t.id} className="border-b border-b-border last:border-0">
                  <td className="px-3 py-2">{t.codigo}</td>
                  <td className="px-3 py-2">{t.descripcion}</td>
                  <td className="px-3 py-2">
                    {vigente ? `${vigente.moneda} ${Number(vigente.valor_hora).toFixed(2)}` : '— sin valor cargado —'}
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/categorias/${t.id}`} className="text-xs text-text-muted underline">
                      Ver historial / actualizar valor
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h2 className="text-sm font-semibold">Datos del tipo de categoría</h2>
      <AdminEntityCrud campos={CAMPOS} filas={tipos ?? []} onGuardar={guardarCategoriaTipo} />
    </div>
  )
}
