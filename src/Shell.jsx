import React, { useState } from 'react'

// Compact inline icons (no icon library needed)
const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
    {d}
  </svg>
)
const ICONS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
  ticket: <><path d="M3 9V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3a2 2 0 0 0 0 6v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-6Z" /></>,
  asset: <><rect x="2" y="4" width="20" height="12" rx="1" /><path d="M8 20h8M12 16v4" /></>,
  customer: <><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M17 11h4M19 9v4" /></>,
  contract: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 15h6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  money: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>,
  report: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  team: <><circle cx="9" cy="8" r="3.5" /><path d="M2 20v-1.5A4.5 4.5 0 0 1 6.5 14h5A4.5 4.5 0 0 1 16 18.5V20" /><path d="M17 8.5a3 3 0 0 1 0 5" /></>,
}

const NAV = [
  { group: null, items: [['dashboard', 'Dashboard', 'dashboard', ['admin', 'accounts']]] },
  {
    group: 'Service Desk',
    items: [
      ['tickets', 'Tickets', 'ticket', ['admin', 'accounts', 'engineer', 'operations']],
      ['attendance', 'Attendance', 'clock', ['admin', 'engineer', 'operations']],
    ],
  },
  {
    group: 'Assets',
    items: [['assets', 'All Assets', 'asset', ['admin', 'engineer', 'operations']]],
  },
  {
    group: 'Customers',
    items: [
      ['customers', 'Customers', 'customer', ['admin', 'operations']],
      ['contracts', 'AMC Contracts', 'contract', ['admin']],
    ],
  },
  {
    group: 'Finance',
    items: [['expenses', 'Expenses', 'money', ['admin', 'accounts', 'engineer', 'operations']]],
  },
  {
    group: 'Insights',
    items: [
      ['reports', 'Reports & Exports', 'report', ['admin', 'accounts']],
      ['team', 'Team & Roles', 'team', ['admin']],
    ],
  },
]

const TITLES = {
  dashboard: ['Dashboard', 'Business health at a glance'],
  tickets: ['Tickets', 'Service desk queue with SLA tracking'],
  attendance: ['Attendance', 'Field check-in and site time'],
  assets: ['All Assets', 'Asset register, allotment and QR labels'],
  customers: ['Customers', 'Client master and portal logins'],
  contracts: ['AMC Contracts', 'Contracts, values and renewals'],
  expenses: ['Expenses', 'Travel claims and approvals'],
  reports: ['Reports & Exports', 'Excel reports and full data backup'],
  team: ['Team & Roles', 'Staff access control'],
}

export default function Shell({ role, tab, setTab, session, onSignOut, notice, filterVenture, setFilterVenture, ventures, children }) {
  const [open, setOpen] = useState(false)
  const [heading, sub] = TITLES[tab] || ['', '']

  const groups = NAV.map((g) => ({ ...g, items: g.items.filter(([, , , roles]) => roles.includes(role)) })).filter((g) => g.items.length)

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.group && <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-2 mb-1.5">{g.group}</p>}
          <ul className="space-y-0.5">
            {g.items.map(([k, label, icon]) => (
              <li key={k}>
                <button
                  onClick={() => {
                    setTab(k)
                    setOpen(false)
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition ${
                    tab === k ? 'bg-rose-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon d={ICONS[icon]} />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col bg-slate-900 border-r-2 border-rose-600 sticky top-0 h-screen">
        <div className="px-4 py-4 border-b border-slate-800 flex items-center gap-2.5">
          <span className="bg-white rounded-md p-1 inline-flex"><img src="/logo.png" alt="EasyGo Solution" className="h-7" /></span>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold tracking-tight truncate">EASYGO SOLUTIONS</p>
            <p className="text-slate-500 text-[10px] truncate">IT Asset &amp; Service Management</p>
          </div>
        </div>
        {nav}
        <div className="px-4 py-3 border-t border-slate-800">
          <p className="text-xs text-slate-300 truncate">{session.user.email}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">
            {role} ·{' '}
            <button onClick={onSignOut} className="text-rose-400 hover:text-white normal-case">Sign out</button>
          </p>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="w-64 bg-slate-900 flex flex-col">
            <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
              <span className="bg-white rounded-md p-1 inline-flex"><img src="/logo.png" alt="EasyGo Solution" className="h-7" /></span>
              <button onClick={() => setOpen(false)} className="text-slate-400 text-sm">Close</button>
            </div>
            {nav}
            <div className="px-4 py-3 border-t border-slate-800">
              <p className="text-xs text-slate-300 truncate">{session.user.email}</p>
              <button onClick={onSignOut} className="text-[10px] text-rose-400 uppercase">Sign out</button>
            </div>
          </div>
          <button className="flex-1 bg-black/50" onClick={() => setOpen(false)} aria-label="Close menu" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="px-4 lg:px-6 py-3 flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setOpen(true)} className="lg:hidden h-9 w-9 inline-flex items-center justify-center border border-slate-300 rounded-md" aria-label="Open menu">
                <Icon d={<><path d="M4 6h16M4 12h16M4 18h16" /></>} />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold tracking-tight truncate">{heading}</h1>
                <p className="text-xs text-slate-500 truncate">{sub}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {notice && <span className="hidden sm:inline text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">{notice}</span>}
              <select
                value={filterVenture}
                onChange={(e) => setFilterVenture(e.target.value)}
                className="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
                aria-label="Filter by venture"
              >
                <option>All</option>
                {(ventures || []).map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
        </header>

        <main className="px-4 lg:px-6 py-5 space-y-4 max-w-[1600px]">{children}</main>
      </div>
    </div>
  )
}
