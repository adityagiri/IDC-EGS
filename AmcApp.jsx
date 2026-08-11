import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import AssetsTab from './AssetsTab'
import TicketsTab from './TicketsTab'
import AttendanceTab from './AttendanceTab'
import ExpensesTab from './ExpensesTab'
import ReportsTab from './ReportsTab'
import TeamTab from './TeamTab'
import { DataTable, SectionBar, chip } from './ui'

const VENTURES = ['IDC', 'EasyGo']
const SEGMENTS = ['Real Estate', 'Hospital / Healthcare', 'Education', 'SMB / Retail', 'Manufacturing', 'Other']
const TIERS = ['Bronze', 'Silver', 'Gold', 'Custom']
const BILLING = ['Annual', 'Half-Yearly', 'Quarterly', 'Monthly']

const ventureStyle = { IDC: 'bg-indigo-100 text-indigo-800', EasyGo: 'bg-teal-100 text-teal-800' }
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const daysLeft = (end) => (end ? Math.ceil((new Date(end + 'T23:59:59') - new Date()) / 86400000) : null)
const contractStatus = (c) => {
  if (c.closed) return { label: 'Closed', tone: 'bg-slate-200 text-slate-500' }
  const d = daysLeft(c.end_date)
  if (d === null) return { label: 'No end date', tone: 'bg-gray-100 text-gray-600' }
  if (d < 0) return { label: 'Expired', tone: 'bg-red-100 text-red-700' }
  if (d <= 30) return { label: `${d}d — renew now`, tone: 'bg-red-100 text-red-700' }
  if (d <= 60) return { label: `${d}d — start renewal`, tone: 'bg-amber-100 text-amber-800' }
  if (d <= 90) return { label: `${d}d — plan QBR`, tone: 'bg-yellow-100 text-yellow-800' }
  return { label: `${d}d left`, tone: 'bg-emerald-100 text-emerald-700' }
}

const emptyCustomer = { venture: 'IDC', company: '', contact: '', phone: '', email: '', cc_emails: '', segment: 'Real Estate', notes: '' }
const emptyContract = { customer_id: '', tier: 'Silver', value: '', billing: 'Annual', start_date: '', end_date: '', scope: '' }

export default function AmcApp({ session, onSignOut }) {
  const [customers, setCustomers] = useState([])
  const [contracts, setContracts] = useState([])
  const [assets, setAssets] = useState([])
  const [tickets, setTickets] = useState([])
  const [reports, setReports] = useState([])
  const [attendance, setAttendance] = useState([])
  const [expenses, setExpenses] = useState([])
  const [feedback, setFeedback] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')
  const [custForm, setCustForm] = useState(null)
  const [conForm, setConForm] = useState(null)
  const [filterVenture, setFilterVenture] = useState('All')
  const [notice, setNotice] = useState('')

  const flash = (m) => {
    setNotice(m)
    setTimeout(() => setNotice(''), 2500)
  }

  const loadAll = async () => {
    const [c1, c2, c3, c4, c5, c6, c7, c8, c9] = await Promise.all([
      supabase.from('customers').select('*').order('company'),
      supabase.from('contracts').select('*').order('end_date'),
      supabase.from('assets').select('*').order('asset_code'),
      supabase.from('tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('service_reports').select('*').order('date', { ascending: false }).limit(500),
      supabase.from('attendance').select('*').order('check_in', { ascending: false }).limit(500),
      supabase.from('expenses').select('*').order('date', { ascending: false }).limit(1000),
      supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('staff_roles').select('*').order('email'),
    ])
    if (c1.error) flash('Load error: ' + c1.error.message)
    setCustomers(c1.data || [])
    setContracts(c2.data || [])
    setAssets(c3.data || [])
    setTickets(c4.data || [])
    setReports(c5.data || [])
    setAttendance(c6.data || [])
    setExpenses(c7.data || [])
    setFeedback(c8.data || [])
    setStaff(c9.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  const role = useMemo(() => {
    const mine = staff.find((s) => s.email === session.user.email)
    if (mine) return mine.role
    return staff.length === 0 ? 'admin' : 'engineer'
  }, [staff, session])

  useEffect(() => {
    if (!loading) {
      const allowed = {
        admin: ['dashboard', 'customers', 'contracts', 'assets', 'tickets', 'attendance', 'expenses', 'reports', 'team'],
        accounts: ['dashboard', 'tickets', 'expenses', 'reports'],
        engineer: ['assets', 'tickets', 'attendance', 'expenses'],
        operations: ['customers', 'assets', 'tickets', 'attendance', 'expenses'],
      }[role] || ['tickets']
      if (!allowed.includes(tab)) setTab(allowed[0])
    }
  }, [role, loading])

  const customersById = useMemo(() => {
    const m = {}
    customers.forEach((c) => (m[c.id] = c))
    return m
  }, [customers])
  const assetsById = useMemo(() => {
    const m = {}
    assets.forEach((a) => (m[a.id] = a))
    return m
  }, [assets])

  const visibleCustomers = customers.filter((c) => filterVenture === 'All' || c.venture === filterVenture)
  const visibleContracts = contracts.filter((c) => {
    const cust = customersById[c.customer_id]
    return filterVenture === 'All' || (cust && cust.venture === filterVenture)
  })

  const metrics = useMemo(() => {
    const active = visibleContracts.filter((c) => !c.closed && (daysLeft(c.end_date) ?? 1) >= 0)
    const acv = active.reduce((s, c) => {
      const mult = { Annual: 1, 'Half-Yearly': 2, Quarterly: 4, Monthly: 12 }[c.billing] || 1
      return s + (Number(c.value) || 0) * mult
    }, 0)
    const bucket = (lo, hi) =>
      visibleContracts.filter((c) => {
        if (c.closed) return false
        const d = daysLeft(c.end_date)
        return d !== null && d >= lo && d <= hi
      }).length
    const openTickets = tickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length
    return { customers: visibleCustomers.length, active: active.length, acv, d30: bucket(0, 30), d60: bucket(31, 60), d90: bucket(61, 90), assets: assets.length, openTickets }
  }, [visibleContracts, visibleCustomers, tickets, assets])

  const renewalQueue = useMemo(
    () =>
      [...visibleContracts]
        .filter((c) => c.end_date && !c.closed)
        .sort((a, b) => (daysLeft(a.end_date) ?? 9999) - (daysLeft(b.end_date) ?? 9999))
        .slice(0, 15),
    [visibleContracts]
  )

  const saveCustomer = async () => {
    if (!custForm.company.trim()) return
    const row = { ...custForm }
    delete row.created_at
    let error
    if (row.id) ({ error } = await supabase.from('customers').update(row).eq('id', row.id))
    else {
      delete row.id
      ;({ error } = await supabase.from('customers').insert(row))
    }
    if (error) return flash('Save failed: ' + error.message)
    setCustForm(null)
    flash('Customer saved')
    loadAll()
  }
  const deleteCustomer = async (id) => {
    if (!window.confirm('Delete this customer and everything linked to them?')) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) return flash('Delete failed: ' + error.message)
    loadAll()
  }
  const saveContract = async () => {
    if (!conForm.customer_id || !conForm.end_date) return
    const row = { ...conForm, value: Number(conForm.value) || 0, start_date: conForm.start_date || null }
    delete row.created_at
    let error
    if (row.id) ({ error } = await supabase.from('contracts').update(row).eq('id', row.id))
    else {
      delete row.id
      ;({ error } = await supabase.from('contracts').insert(row))
    }
    if (error) return flash('Save failed: ' + error.message)
    setConForm(null)
    flash('Contract saved')
    loadAll()
  }
  const deleteContract = async (id) => {
    if (!window.confirm('Delete this contract permanently? Use Close instead to keep history.')) return
    const { error } = await supabase.from('contracts').delete().eq('id', id)
    if (error) return flash('Delete failed: ' + error.message)
    loadAll()
  }
  const closeContract = async (contract) => {
    if (!window.confirm(`Close the ${contract.tier} contract? It leaves the radar and totals but stays in records.`)) return
    const { error } = await supabase.from('contracts').update({ closed: true }).eq('id', contract.id)
    if (error) return flash('Close failed: ' + error.message)
    flash('Contract closed')
    loadAll()
  }
  const reopenContract = async (contract) => {
    const { error } = await supabase.from('contracts').update({ closed: false }).eq('id', contract.id)
    if (error) return flash('Reopen failed: ' + error.message)
    flash('Contract reopened')
    loadAll()
  }

  const input = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const label = 'block text-xs font-medium text-slate-500 mb-1'
  const btn = 'px-4 py-2 rounded-md text-sm font-medium'

  const act = (fn, text, tone) => (
    <button onClick={fn} className={`text-xs ${tone || 'text-indigo-700'} hover:underline font-medium mr-2`}>
      {text}
    </button>
  )

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-900 text-white border-b-4 border-indigo-600">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center gap-4 justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">AMC COMMAND CENTER</h1>
            <p className="text-slate-400 text-xs">India Digital Corporation · EasyGo Solutions · ERP</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-emerald-400 h-4">{notice}</span>
            <select value={filterVenture} onChange={(e) => setFilterVenture(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm">
              <option>All</option>
              {VENTURES.map((v) => <option key={v}>{v}</option>)}
            </select>
            <div className="text-right border-l border-slate-700 pl-3">
              <p className="text-xs text-slate-300">{session.user.email}</p>
              <p className="text-xs text-slate-500 uppercase">{role} · <button onClick={onSignOut} className="text-indigo-300 hover:text-white normal-case">Sign out</button></p>
            </div>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 flex gap-0.5 overflow-x-auto">
          {[
            ['dashboard', 'Dashboard', ['admin', 'accounts']],
            ['customers', 'Customers', ['admin', 'operations']],
            ['contracts', 'Contracts', ['admin']],
            ['assets', 'Assets', ['admin', 'engineer', 'operations']],
            ['tickets', 'Tickets', ['admin', 'accounts', 'engineer', 'operations']],
            ['attendance', 'Attendance', ['admin', 'engineer', 'operations']],
            ['expenses', 'Expenses', ['admin', 'accounts', 'engineer', 'operations']],
            ['reports', 'Reports', ['admin', 'accounts']],
            ['team', 'Team', ['admin']],
          ]
            .filter(([, , roles]) => roles.includes(role))
            .map(([k, t]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-4 py-2 text-sm whitespace-nowrap border-t border-l border-r rounded-t ${
                  tab === k ? 'bg-slate-100 text-slate-900 font-semibold border-slate-300' : 'text-slate-300 border-transparent hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {loading ? (
          <p className="text-sm text-slate-500">Loading data…</p>
        ) : (
          <>
            {tab === 'dashboard' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-300 border border-slate-300 rounded-md overflow-hidden">
                  {[
                    ['Customers', metrics.customers, ''],
                    ['Active AMCs', metrics.active, ''],
                    ['Annual Contract Value', inr(metrics.acv), ''],
                    ['Open Tickets', metrics.openTickets, metrics.openTickets > 0 ? 'text-red-600' : ''],
                    ['Renew 0–30 days', metrics.d30, 'text-red-600'],
                    ['Renew 31–60 days', metrics.d60, 'text-amber-600'],
                    ['Renew 61–90 days', metrics.d90, 'text-yellow-600'],
                    ['Assets Managed', metrics.assets, 'text-indigo-700'],
                  ].map(([t, v, tone]) => (
                    <div key={t} className="bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">{t}</p>
                      <p className={`text-2xl font-semibold mt-1 tabular-nums ${tone}`}>{v}</p>
                    </div>
                  ))}
                </div>

                <SectionBar title="Renewal Radar" subtitle="Sorted by expiry — work top-down every Monday. Contract scope shown inline." />
                <DataTable
                  empty="No contracts yet."
                  columns={[
                    { key: 'company', label: 'Customer', render: (c) => <span className="font-medium">{customersById[c.customer_id]?.company || 'Unknown'}</span> },
                    { key: 'venture', label: 'Venture', width: '90px', render: (c) => { const v = customersById[c.customer_id]?.venture; return v ? <span className={chip(ventureStyle[v])}>{v}</span> : '' } },
                    { key: 'tier', label: 'Tier', width: '90px' },
                    { key: 'scope', label: 'Contract Scope / Type', render: (c) => <span className="text-slate-600">{c.scope || <span className="text-slate-300">—</span>}</span> },
                    { key: 'value', label: 'Value', align: 'right', width: '110px', render: (c) => inr(c.value) },
                    { key: 'billing', label: 'Billing', width: '100px' },
                    { key: 'end_date', label: 'Ends', width: '110px' },
                    { key: 'status', label: 'Status', width: '160px', render: (c) => { const s = contractStatus(c); return <span className={chip(s.tone)}>{s.label}</span> } },
                  ]}
                  rows={renewalQueue}
                />
              </div>
            )}

            {tab === 'customers' && (
              <div className="space-y-4">
                <SectionBar title={`Customers (${visibleCustomers.length})`} subtitle="Master list of AMC clients across both ventures">
                  <button onClick={() => setCustForm({ ...emptyCustomer })} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>+ Add customer</button>
                </SectionBar>

                {custForm && (
                  <div className="bg-white border border-indigo-300 rounded-md p-4 grid md:grid-cols-3 gap-3">
                    <div><span className={label}>Venture</span>
                      <select className={input} value={custForm.venture} onChange={(e) => setCustForm({ ...custForm, venture: e.target.value })}>{VENTURES.map((v) => <option key={v}>{v}</option>)}</select></div>
                    <div><span className={label}>Company *</span>
                      <input className={input} value={custForm.company} onChange={(e) => setCustForm({ ...custForm, company: e.target.value })} /></div>
                    <div><span className={label}>Segment</span>
                      <select className={input} value={custForm.segment} onChange={(e) => setCustForm({ ...custForm, segment: e.target.value })}>{SEGMENTS.map((s) => <option key={s}>{s}</option>)}</select></div>
                    <div><span className={label}>Contact person</span>
                      <input className={input} value={custForm.contact || ''} onChange={(e) => setCustForm({ ...custForm, contact: e.target.value })} /></div>
                    <div><span className={label}>Phone</span>
                      <input className={input} value={custForm.phone || ''} onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })} /></div>
                    <div><span className={label}>Email (used for customer portal login)</span>
                      <input className={input} value={custForm.email || ''} onChange={(e) => setCustForm({ ...custForm, email: e.target.value })} /></div>
                    <div className="md:col-span-2"><span className={label}>Additional emails — CC on every ticket email (comma separated)</span>
                      <input className={input} value={custForm.cc_emails || ''} onChange={(e) => setCustForm({ ...custForm, cc_emails: e.target.value })} placeholder="manager@client.com, itdesk@client.com" /></div>
                    <div className="md:col-span-3"><span className={label}>Notes</span>
                      <textarea className={input} rows={2} value={custForm.notes || ''} onChange={(e) => setCustForm({ ...custForm, notes: e.target.value })} /></div>
                    <div className="md:col-span-3 flex gap-2">
                      <button onClick={saveCustomer} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>Save</button>
                      <button onClick={() => setCustForm(null)} className={`${btn} bg-slate-200 hover:bg-slate-300`}>Cancel</button>
                    </div>
                  </div>
                )}

                <DataTable
                  empty="No customers yet — add every AMC client, even informal ones."
                  columns={[
                    { key: 'company', label: 'Company', render: (c) => <span className="font-medium">{c.company}</span> },
                    { key: 'venture', label: 'Venture', width: '90px', render: (c) => <span className={chip(ventureStyle[c.venture])}>{c.venture}</span> },
                    { key: 'segment', label: 'Segment', width: '160px' },
                    { key: 'contact', label: 'Contact Person', width: '150px' },
                    { key: 'phone', label: 'Phone', width: '120px' },
                    { key: 'email', label: 'Email' },
                    { key: 'notes', label: 'Notes', render: (c) => <span className="text-slate-500">{c.notes}</span> },
                    { key: 'act', label: 'Actions', width: '120px', render: (c) => (<span>{act(() => setCustForm({ ...c }), 'Edit')}{act(() => deleteCustomer(c.id), 'Delete', 'text-red-600')}</span>) },
                  ]}
                  rows={visibleCustomers}
                />
              </div>
            )}

            {tab === 'contracts' && (
              <div className="space-y-4">
                <SectionBar title={`AMC Contracts (${visibleContracts.length})`} subtitle="Close (not delete) contracts that end — history stays for renewals and audits">
                  <button onClick={() => setConForm({ ...emptyContract })} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50`} disabled={customers.length === 0}>+ Add contract</button>
                </SectionBar>

                {conForm && (
                  <div className="bg-white border border-indigo-300 rounded-md p-4 grid md:grid-cols-3 gap-3">
                    <div><span className={label}>Customer *</span>
                      <select className={input} value={conForm.customer_id} onChange={(e) => setConForm({ ...conForm, customer_id: e.target.value })}>
                        <option value="">Select…</option>
                        {customers.map((c) => <option key={c.id} value={c.id}>{c.company} ({c.venture})</option>)}
                      </select></div>
                    <div><span className={label}>Tier</span>
                      <select className={input} value={conForm.tier} onChange={(e) => setConForm({ ...conForm, tier: e.target.value })}>{TIERS.map((t) => <option key={t}>{t}</option>)}</select></div>
                    <div><span className={label}>Value per billing cycle (₹)</span>
                      <input type="number" className={input} value={conForm.value} onChange={(e) => setConForm({ ...conForm, value: e.target.value })} /></div>
                    <div><span className={label}>Billing cycle</span>
                      <select className={input} value={conForm.billing} onChange={(e) => setConForm({ ...conForm, billing: e.target.value })}>{BILLING.map((b) => <option key={b}>{b}</option>)}</select></div>
                    <div><span className={label}>Start date</span>
                      <input type="date" className={input} value={conForm.start_date || ''} onChange={(e) => setConForm({ ...conForm, start_date: e.target.value })} /></div>
                    <div><span className={label}>End date *</span>
                      <input type="date" className={input} value={conForm.end_date || ''} onChange={(e) => setConForm({ ...conForm, end_date: e.target.value })} /></div>
                    <div className="md:col-span-3"><span className={label}>Scope / contract type (shown on the renewal radar)</span>
                      <textarea className={input} rows={2} value={conForm.scope || ''} onChange={(e) => setConForm({ ...conForm, scope: e.target.value })} placeholder="e.g. 25 desktops + 2 servers + CCTV · 24hr response SLA" /></div>
                    <div className="md:col-span-3 flex gap-2">
                      <button onClick={saveContract} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>Save</button>
                      <button onClick={() => setConForm(null)} className={`${btn} bg-slate-200 hover:bg-slate-300`}>Cancel</button>
                    </div>
                  </div>
                )}

                <DataTable
                  empty="No contracts recorded yet."
                  columns={[
                    { key: 'company', label: 'Customer', render: (c) => <span className="font-medium">{customersById[c.customer_id]?.company || 'Unknown'}</span> },
                    { key: 'tier', label: 'Tier', width: '90px' },
                    { key: 'value', label: 'Value', align: 'right', width: '110px', render: (c) => inr(c.value) },
                    { key: 'billing', label: 'Billing', width: '100px' },
                    { key: 'start_date', label: 'Start', width: '105px' },
                    { key: 'end_date', label: 'End', width: '105px' },
                    { key: 'scope', label: 'Scope / Type', render: (c) => <span className="text-slate-600">{c.scope}</span> },
                    { key: 'status', label: 'Status', width: '150px', render: (c) => { const s = contractStatus(c); return <span className={chip(s.tone)}>{s.label}</span> } },
                    { key: 'act', label: 'Actions', width: '170px', render: (c) => (
                      <span>
                        {act(() => setConForm({ ...c }), 'Edit')}
                        {!c.closed ? act(() => closeContract(c), 'Close', 'text-amber-600') : act(() => reopenContract(c), 'Reopen', 'text-emerald-600')}
                        {act(() => deleteContract(c.id), 'Delete', 'text-red-600')}
                      </span>
                    ) },
                  ]}
                  rows={visibleContracts}
                />
              </div>
            )}

            {tab === 'assets' && <AssetsTab customers={customers} assets={assets} reload={loadAll} flash={flash} role={role} />}
            {tab === 'tickets' && <TicketsTab customers={customers} assets={assets} tickets={tickets} reload={loadAll} flash={flash} session={session} role={role} />}
            {tab === 'attendance' && <AttendanceTab customers={customers} attendance={attendance} reload={loadAll} flash={flash} session={session} />}
            {tab === 'expenses' && <ExpensesTab customers={customers} expenses={expenses} reload={loadAll} flash={flash} session={session} role={role} />}
            {tab === 'team' && role === 'admin' && <TeamTab staff={staff} reload={loadAll} flash={flash} session={session} />}
            {tab === 'reports' && (
              <ReportsTab customers={customers} contracts={contracts} assets={assets} tickets={tickets} reports={reports} attendance={attendance} expenses={expenses} feedback={feedback} flash={flash} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
