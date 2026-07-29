import React from 'react'

// ERP-style structured data table: bordered grid, grey header band, zebra rows,
// aligned columns, wrapped text. Used by every module for a consistent look.
export function DataTable({ columns, rows, empty, footer }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-300 bg-white">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-100 border-b-2 border-slate-300">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 border-r border-slate-200 last:border-r-0 ${
                  c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'
                }`}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400 text-sm">
                {empty || 'No records'}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id || i} className={`border-b border-slate-200 ${i % 2 ? 'bg-slate-50' : 'bg-white'} hover:bg-indigo-50`}>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-2 align-top border-r border-slate-200 last:border-r-0 whitespace-normal break-words ${
                      c.align === 'right' ? 'text-right tabular-nums' : c.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {c.render ? c.render(row) : row[c.key] ?? ''}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {footer && (
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-300 font-medium">{footer}</tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

export const chip = (tone) => `inline-block text-xs px-2 py-0.5 rounded ${tone}`
export const SectionBar = ({ title, subtitle, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-300 rounded-md px-4 py-3">
    <div>
      <h2 className="font-semibold text-slate-800">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
)
