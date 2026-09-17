import React from 'react'

export function DataTable({ columns, rows, empty, footer }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-300 bg-white">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-100 border-b-2 border-slate-300">
            {columns.map((c) => (
              <th key={c.key}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 border-r border-slate-200 last:border-r-0 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'}`}
                style={c.width ? { width: c.width } : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400 text-sm">{empty || 'No records'}</td></tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id || i} className={`border-b border-slate-200 ${i % 2 ? 'bg-slate-50' : 'bg-white'} hover:bg-rose-50`}>
                {columns.map((c) => (
                  <td key={c.key}
                    className={`px-3 py-2 align-top border-r border-slate-200 last:border-r-0 whitespace-normal break-words ${c.align === 'right' ? 'text-right tabular-nums' : c.align === 'center' ? 'text-center' : 'text-left'}`}>
                    {c.render ? c.render(row) : row[c.key] ?? ''}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {footer && <tfoot><tr className="bg-slate-100 border-t-2 border-slate-300 font-medium">{footer}</tr></tfoot>}
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

/* ---------- v11 ITSM UI KIT ---------- */

export const relTime = (ts) => {
  if (!ts) return ''
  const s = (Date.now() - new Date(ts)) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`
  if (s < 2592000) return `${Math.floor(s / 86400)} days ago`
  return new Date(ts).toLocaleDateString('en-IN')
}

// "-19h 17m" style SLA clock: negative = breached
export const slaClock = (dueAt, closed) => {
  if (!dueAt) return null
  const mins = Math.round((new Date(dueAt) - Date.now()) / 60000)
  const breached = mins < 0
  const a = Math.abs(mins)
  const txt = a >= 1440 ? `${Math.floor(a / 1440)}d ${Math.floor((a % 1440) / 60)}h` : `${Math.floor(a / 60)}h ${a % 60}m`
  return { text: (breached ? '-' : '') + txt, breached: breached && !closed }
}

export const StatCard = ({ label, value, tone }) => (
  <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 min-w-0">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">{label}</p>
    <p className={`text-2xl font-semibold mt-1 tabular-nums ${tone || 'text-slate-900'}`}>{value}</p>
  </div>
)

export const Pill = ({ text, tone, dot }) => (
  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${tone}`}>
    {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
    {text}
  </span>
)

export const STATUS_PILL = {
  Open: { tone: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  'In Progress': { tone: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  'On Hold': { tone: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  Resolved: { tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Closed: { tone: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
}
export const PRIORITY_PILL = {
  Critical: { tone: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-600' },
  High: { tone: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  Medium: { tone: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  Low: { tone: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
}

export const Avatar = ({ name }) => {
  const label = (name || '?').replace(/@.*/, '')
  const initials = label.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span className="h-5 w-5 shrink-0 rounded-full bg-slate-800 text-white text-[9px] font-semibold inline-flex items-center justify-center">{initials || '?'}</span>
      <span className="truncate">{label}</span>
    </span>
  )
}

// Dependency-free SVG donut
export const Donut = ({ data, total, centerLabel }) => {
  const sum = total ?? data.reduce((s, d) => s + d.value, 0)
  if (!sum) return <p className="text-sm text-slate-400 py-10 text-center">No data yet</p>
  const R = 52, C = 2 * Math.PI * R
  let acc = 0
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0">
        <g transform="translate(70,70) rotate(-90)">
          <circle r={R} fill="none" stroke="#f1f5f9" strokeWidth="16" />
          {data.filter((d) => d.value > 0).map((d, i) => {
            const len = (d.value / sum) * C
            const el = <circle key={i} r={R} fill="none" stroke={d.color} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} />
            acc += len
            return el
          })}
        </g>
        <text x="70" y="68" textAnchor="middle" className="fill-slate-900" style={{ fontSize: 24, fontWeight: 600 }}>{sum}</text>
        <text x="70" y="86" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 10 }}>{centerLabel || 'tickets'}</text>
      </svg>
      <ul className="text-xs space-y-1.5 min-w-0">
        {data.filter((d) => d.value > 0).map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="truncate text-slate-600">{d.label}</span>
            <span className="tabular-nums font-medium text-slate-900">{d.value}</span>
            <span className="tabular-nums text-slate-400">{Math.round((d.value / sum) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export const BarList = ({ rows }) => {
  if (!rows.length) return <p className="text-sm text-slate-400 py-10 text-center">No data yet</p>
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="truncate text-slate-700">{r.label}</span>
            <span className="tabular-nums font-medium">{r.value}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

// Grouped created-vs-resolved columns over the last N days
export const TrendBars = ({ days }) => {
  const max = Math.max(...days.flatMap((d) => [d.created, d.resolved]), 1)
  return (
    <div>
      <div className="flex items-end gap-1 h-40">
        {days.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
            <div className="flex items-end gap-0.5 h-32 w-full justify-center">
              <div className="w-2 bg-blue-500 rounded-t" style={{ height: `${(d.created / max) * 100}%` }} title={`Created ${d.created}`} />
              <div className="w-2 bg-emerald-500 rounded-t" style={{ height: `${(d.resolved / max) * 100}%` }} title={`Resolved ${d.resolved}`} />
            </div>
            <span className="text-[9px] text-slate-400 truncate w-full text-center">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-slate-600 mt-2">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" />Created</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Resolved</span>
      </div>
    </div>
  )
}

export const Panel = ({ title, children, className }) => (
  <div className={`bg-white border border-slate-200 rounded-lg p-4 ${className || ''}`}>
    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">{title}</p>
    {children}
  </div>
)

export const ViewsRail = ({ views, active, onPick }) => (
  <aside className="w-full lg:w-48 shrink-0">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-2">Views</p>
    <ul className="space-y-0.5">
      {views.map((v) => (
        <li key={v.key}>
          <button onClick={() => onPick(v.key)}
            className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-sm text-left ${active === v.key ? 'bg-slate-200 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}>
            <span className="truncate">{v.label}</span>
            <span className={`tabular-nums text-xs ${v.count ? 'text-slate-500' : 'text-slate-300'}`}>{v.count}</span>
          </button>
        </li>
      ))}
    </ul>
  </aside>
)

export const Pagination = ({ page, pages, total, shown, onPage }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 px-1">
    <span>Showing {shown} of {total}</span>
    <span className="flex items-center gap-2">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40 hover:bg-white">‹ Prev</button>
      <span>Page {page} of {pages}</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40 hover:bg-white">Next ›</button>
    </span>
  </div>
)
