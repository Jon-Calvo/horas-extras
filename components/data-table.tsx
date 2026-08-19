'use client'

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type OnChangeFn, type RowSelectionState } from '@tanstack/react-table'

export function DataTable<TData>({
  columns,
  data,
  rowSelection,
  onRowSelectionChange,
  getRowId,
}: {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  // Selección de filas es opcional: si no se pasan estas dos props, la
  // tabla se comporta exactamente igual que antes (sin checkboxes).
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  getRowId?: (row: TData) => string
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: rowSelection !== undefined ? { rowSelection } : undefined,
    onRowSelectionChange,
    getRowId,
    enableRowSelection: Boolean(onRowSelectionChange),
  })

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="border-b border-b-border bg-background text-left">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-3 py-2 font-medium text-text-muted">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-b-border last:border-0 hover:bg-text/5">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-text-muted">
                Sin resultados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
