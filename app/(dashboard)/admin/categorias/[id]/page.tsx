import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatFechaSolo } from '@/lib/format'
import { NuevoValorForm } from './nuevo-valor-form'

export default async function CategoriaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: tipo }, { data: historial }] = await Promise.all([
    supabase.from('categoria_tipos').select('*').eq('id', id).maybeSingle(),
    supabase.from('categoria_valores').select('*').eq('categoria_tipo_id', id).order('vigencia_desde', { ascending: false }),
  ])

  if (!tipo) notFound()

  const vigente = (historial ?? []).find((v) => v.vigencia_hasta === null)

  return (
    <div className="space-y-4">
      <Link href="/admin/categorias" className="text-xs text-slate-500 underline">
        ← Volver a categorías
      </Link>
      <h1 className="text-lg font-semibold">
        {tipo.codigo} — {tipo.descripcion}
      </h1>

      <NuevoValorForm categoriaTipoId={id} monedaActual={vigente?.moneda ?? 'ARS'} />

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Valor hora</th>
              <th className="px-3 py-2">Moneda</th>
              <th className="px-3 py-2">Vigente desde</th>
              <th className="px-3 py-2">Vigente hasta</th>
            </tr>
          </thead>
          <tbody>
            {(historial ?? []).map((v) => (
              <tr key={v.id} className="border-b last:border-0">
                <td className="px-3 py-2">{Number(v.valor_hora).toFixed(2)}</td>
                <td className="px-3 py-2">{v.moneda}</td>
                <td className="px-3 py-2">{formatFechaSolo(v.vigencia_desde)}</td>
                <td className="px-3 py-2">{v.vigencia_hasta ? formatFechaSolo(v.vigencia_hasta) : 'Vigente'}</td>
              </tr>
            ))}
            {(historial ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                  Todavía no se cargó ningún valor
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
