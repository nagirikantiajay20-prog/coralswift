import type { ReactNode } from 'react'
import { EmptyState } from './states'

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyTitle = 'No records',
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  emptyTitle?: string
}) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line bg-surface text-xs uppercase text-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.header} scope="col" className="px-4 py-3 font-medium">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-line last:border-0">
              {columns.map((c) => (
                <td key={c.header} className="px-4 py-3">
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
