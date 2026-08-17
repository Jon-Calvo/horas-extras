import { createClient } from '@/lib/supabase/server'
import type { CampoAdmin } from '@/components/admin/admin-entity-crud'
import { ExportarExcelBoton } from '@/components/excel/exportar-excel-boton'
import { ImportarExcelGenerico } from '@/components/excel/importar-excel-generico'
import { EmpleadosLista, type EmpleadoRow } from './empleados-lista'
import { importarFilaEmpleado } from './actions'

// Columnas del Excel de import/export: por NOMBRE (no UUID) para
// área/sector/proceso — es lo que un archivo de RRHH va a traer.
// rpc_importar_empleado_excel (0033) resuelve esos nombres del lado de la base.
const CAMPOS_IMPORT: CampoAdmin[] = [
  { key: 'legajo', label: 'Legajo', type: 'text' },
  { key: 'nombreCompleto', label: 'Nombre completo', type: 'text' },
  { key: 'categoriaCodigo', label: 'Categoría', type: 'text' },
  { key: 'areaNombre', label: 'Área', type: 'text' },
  { key: 'sectorNombre', label: 'Sector', type: 'text' },
  { key: 'procesoNombre', label: 'Proceso', type: 'text' },
  {
    key: 'estado',
    label: 'Estado',
    type: 'select',
    opciones: [
      { value: 'ACTIVO', label: 'Activo' },
      { value: 'INACTIVO', label: 'Inactivo' },
    ],
  },
]

// Columnas del export: legibles, con nombres en vez de ids (más útil para
// abrir en Excel que exportar UUIDs).
const CAMPOS_EXPORT: CampoAdmin[] = [
  { key: 'legajo', label: 'Legajo', type: 'text' },
  { key: 'nombre_completo', label: 'Nombre completo', type: 'text' },
  { key: 'categoria_codigo', label: 'Categoría', type: 'text' },
  { key: 'area_nombre', label: 'Área', type: 'text' },
  { key: 'sector_nombre', label: 'Sector', type: 'text' },
  { key: 'proceso_nombre', label: 'Proceso', type: 'text' },
  { key: 'estado', label: 'Estado', type: 'text' },
  { key: 'ranking_horas', label: 'Ranking horas', type: 'number' },
  { key: 'ib_descripcion', label: 'IB', type: 'text' },
]

export default async function EmpleadosPage() {
  const supabase = await createClient()

  const [{ data: empleadosRaw }, { data: areas }, { data: sectores }, { data: procesos }, { data: categorias }, { data: esAdmin }] =
    await Promise.all([
      supabase.from('vista_empleados_resumen').select('*').order('nombre_completo'),
      supabase.from('areas').select('id, nombre').eq('activo', true).order('nombre'),
      supabase.from('sectores').select('id, nombre, area_id').eq('activo', true).order('nombre'),
      supabase.from('procesos').select('id, nombre, sector_id').eq('activo', true).order('nombre'),
      supabase.from('categoria_tipos').select('codigo, descripcion').eq('activo', true).order('codigo'),
      supabase.rpc('fn_es_admin'),
    ])

  const empleados: EmpleadoRow[] = (empleadosRaw ?? [])
    .filter(
      (e): e is typeof e & {
        id: string
        legajo: string
        nombre_completo: string
        categoria_codigo: string
        estado: 'ACTIVO' | 'INACTIVO'
      } =>
        e.id !== null &&
        e.legajo !== null &&
        e.nombre_completo !== null &&
        e.categoria_codigo !== null &&
        e.estado !== null
    )
    .map((e) => ({
      id: e.id,
      legajo: e.legajo,
      nombreCompleto: e.nombre_completo,
      categoriaCodigo: e.categoria_codigo,
      areaNombre: e.area_nombre,
      sectorNombre: e.sector_nombre,
      procesoNombre: e.proceso_nombre,
      estado: e.estado,
      rankingHoras: Number(e.ranking_horas),
      ibDescripcion: e.ib_descripcion,
      areaId: e.area_id ?? '',
      sectorId: e.sector_id ?? '',
      procesoId: e.proceso_id ?? '',
    }))

  const opciones = {
    areas: areas ?? [],
    sectores: (sectores ?? []).map((s) => ({ id: s.id, nombre: s.nombre, areaId: s.area_id })),
    procesos: (procesos ?? []).map((p) => ({ id: p.id, nombre: p.nombre, sectorId: p.sector_id })),
    categorias: categorias ?? [],
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Empleados</h1>
        <div className="flex gap-2">
          <ExportarExcelBoton campos={CAMPOS_EXPORT} filas={empleadosRaw ?? []} nombreArchivo="empleados" />
          <ImportarExcelGenerico
            campos={CAMPOS_IMPORT}
            onGuardarFila={importarFilaEmpleado}
            plantillaEjemplo={{
              Legajo: '1004',
              'Nombre completo': 'Ejemplo Apellido',
              Categoría: 'CAT001',
              Área: '',
              Sector: '',
              Proceso: '',
              Estado: 'ACTIVO',
            }}
          />
        </div>
      </div>
      <p className="text-sm text-slate-500">
        El import por Excel hace upsert por legajo (crea si no existe, actualiza si ya existe) — usa
        rpc_importar_empleado_excel, que resuelve Área/Sector/Proceso por nombre.
      </p>
      <EmpleadosLista empleados={empleados} opciones={opciones} esAdmin={Boolean(esAdmin)} />
    </div>
  )
}

