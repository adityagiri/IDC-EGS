import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { DataTable, chip } from './ui'
import { DEVICE_TYPE_LIST, ASSET_STATUSES } from './checklists'

const input = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const label = 'block text-xs font-medium text-slate-500 mb-1'
const btn = 'px-4 py-2 rounded-md text-sm font-medium'

const statusTone = {
  Open: 'bg-red-100 text-red-700',
  'In Progress': 'bg-amber-100 text-amber-800',
  'On Hold': 'bg-slate-100 text-slate-600',
  Resolved: 'bg-emerald-100 text-emerald-700',
  Closed: 'bg-slate-200 text-slate-500',
}
const assetStatusTone = {
  'In Use': 'bg-emerald-100 text-emerald-700',
  'In Store': 'bg-blue-100 text-blue-700',
  'Under Repair': 'bg-amber-100 text-amber-800',
  Scrapped: 'bg-red-100 text-red-700',
}

const fmtDT = (ts) =>
  ts ? new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

const tatDays = (t) => {
  if (!t.created_at || !t.resolved_at) return null
  return Math.round(((new Date(t.resolved_at) - new Date(t.created_at)) / 86400000) * 10) / 10
}

const emptyAsset = { device_type: 'Desktop / Laptop', brand: '', model: '', serial_number: '', location: '', assigned_to: '', department: '', status: 'In Use', notes: '' }

export default function CustomerPortal({ customer, session, onSignOut }) {
  const [tab, setTab] = useState('tickets')
  const [tickets, setTickets] = useState([])
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [assetForm, setAssetForm] = useState(null)
  const [notice, setNotice] = useState('')

  const flash = (m) => {
    setNotice(m)
    setTimeout(() => setNotice(''), 3000)
  }

  const load = async () => {
    const [t, a] = await Promise.all([
      supabase.from('tickets').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
      supabase.from('assets').select('*').eq('customer_id', customer.id).order('asset_code'),
    ])
    setTickets(t.data || [])
    setAssets(a.data || [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const stats = useMemo(() => {
    const resolved = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length
    return { raised: tickets.length, resolved, pending: tickets.length - resolved, assets: assets.length }
  }, [tickets, assets])

  // ---- Tickets ----
  const submitTicket = async () => {
    if (!form.title.trim()) return flash('Please describe the issue in the title')
    const { error } = await supabase.from('tickets').insert({
      customer_id: customer.id,
      title: form.title,
      description: form.description || null,
      affected_user: form.affected_user || null,
      asset_id: form.asset_id || null,
      priority: form.priority,
      status: 'Open',
      created_by: session.user.email,
    })
    if (error) return flash('Could not submit: ' + error.message)
    setForm(null)
    flash('Ticket submitted — our team has been notified ✓')
    load()
  }

  // ---- Assets (self-service asset management) ----
  const saveAsset = async () => {
    if (!assetForm.serial_number.trim()) return flash('Serial number is required')
    const row = { ...assetForm, customer_id: customer.id }
    delete row.created_at
    let error
    if (row.id) {
      ;({ error } = await supabase.from('assets').update(row).eq('id', row.id))
    } else {
      delete row.id
      row.asset_code = 'AST-' + Date.now().toString(36).toUpperCase()
      ;({ error } = await supabase.from('assets').insert(row))
    }
    if (error) return flash('Save failed: ' + error.message)
    setAssetForm(null)
    flash('Asset saved ✓')
    load()
  }

  const removeAsset = async (a) => {
    if (!window.confirm(`Remove ${a.asset_code} (${a.device_type})? Its service history will also be removed.`)) return
    const { error } = await supabase.from('assets').delete().eq('id', a.id)
    if (error) return flash('Delete failed: ' + error.message)
    flash('Asset removed')
    load()
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-900 text-white border-b-4 border-indigo-600">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">SUPPORT PORTAL</h1>
            <p className="text-slate-400 text-xs">{customer.company} · India Digital Corporation / EasyGo Solutions</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-300">{session.user.email}</p>
            <button onClick={onSignOut} className="text-xs text-indigo-300 hover:text-white">Sign out</button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-0.5">
          {[
            ['tickets', 'My Tickets'],
            ['assets', 'My Assets'],
          ].map(([k, t]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 text-sm border-t border-l border-r rounded-t ${tab === k ? 'bg-slate-100 text-slate-900 font-semibold border-slate-300' : 'text-slate-300 border-transparent hover:text-white'}`}>
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        {notice && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">{notice}</p>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-300 border border-slate-300 rounded-md overflow-hidden">
          {[
            ['Tickets Raised', stats.raised, ''],
            ['Resolved', stats.resolved, 'text-emerald-600'],
            ['Pending', stats.pending, stats.pending > 0 ? 'text-red-600' : ''],
            ['Registered Assets', stats.assets, 'text-indigo-700'],
          ].map(([t, v, tone]) => (
            <div key={t} className="bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t}</p>
              <p className={`text-2xl font-semibold mt-1 tabular-nums ${tone}`}>{v}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : tab === 'tickets' ? (
          <>
            {!form ? (
              <button onClick={() => setForm({ title: '', description: '', affected_user: '', asset_id: '', priority: 'Medium' })}
                className={`${btn} w-full md:w-auto bg-indigo-600 text-white hover:bg-indigo-700 py-3`}>
                + Raise a new complaint / ticket
              </button>
            ) : (
              <div className="bg-white border border-indigo-300 rounded-md p-4 grid md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <span className={label}>What is the issue? *</span>
                  <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Printer in accounts department not working" />
                </div>
                <div>
                  <span className={label}>Urgency</span>
                  <select className={input} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {['Low', 'Medium', 'High', 'Critical'].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <span className={label}>Raised for (employee name)</span>
                  <input className={input} value={form.affected_user} onChange={(e) => setForm({ ...form, affected_user: e.target.value })} placeholder="Who is facing this issue?" />
                </div>
                <div>
                  <span className={label}>Related device (optional)</span>
                  <select className={input} value={form.asset_id} onChange={(e) => setForm({ ...form, asset_id: e.target.value })}>
                    <option value="">Not device-specific</option>
                    {assets.map((a) => <option key={a.id} value={a.id}>{a.asset_code} — {a.device_type} {a.assigned_to ? `(${a.assigned_to})` : ''}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <span className={label}>Details (location, error message, since when…)</span>
                  <textarea className={input} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="md:col-span-3 flex gap-2">
                  <button onClick={submitTicket} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>Submit ticket</button>
                  <button onClick={() => setForm(null)} className={`${btn} bg-slate-200 hover:bg-slate-300`}>Cancel</button>
                </div>
              </div>
            )}

            <DataTable
              empty="No tickets yet. Raise one above whenever you face an IT issue — our team is notified instantly."
              columns={[
                { key: 'created_at', label: 'Raised On', width: '145px', render: (t) => <span className="text-xs">{fmtDT(t.created_at)}</span> },
                { key: 'title', label: 'Issue', render: (t) => (
                  <span>
                    <span className="font-medium">{t.title}</span>
                    {t.affected_user && <span className="block text-xs text-indigo-700 mt-0.5">For: {t.affected_user}</span>}
                    {t.description && <span className="block text-xs text-slate-500 mt-0.5">{t.description}</span>}
                  </span>
                ) },
                { key: 'priority', label: 'Urgency', width: '85px' },
                { key: 'status', label: 'Status', width: '105px', render: (t) => <span className={chip(statusTone[t.status] || '')}>{t.status}</span> },
                { key: 'resolved_at', label: 'Resolved On', width: '145px', render: (t) => <span className="text-xs">{fmtDT(t.resolved_at)}</span> },
                { key: 'tat', label: 'Time Taken', width: '95px', align: 'right', render: (t) => {
                  const d = tatDays(t)
                  return d !== null ? <span className="text-xs text-emerald-700 tabular-nums">{d} days</span> : ''
                } },
              ]}
              rows={tickets}
            />
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-300 rounded-md px-4 py-3">
              <div>
                <h2 className="font-semibold text-slate-800">Your Asset Register</h2>
                <p className="text-xs text-slate-500 mt-0.5">Manage your own IT assets — allot to employees, track status. Our service team sees the same list.</p>
              </div>
              <button onClick={() => setAssetForm({ ...emptyAsset })} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>
                + Add asset
              </button>
            </div>

            {assetForm && (
              <div className="bg-white border border-indigo-300 rounded-md p-4 grid md:grid-cols-3 gap-3">
                <div>
                  <span className={label}>Device type</span>
                  <select className={input} value={assetForm.device_type} onChange={(e) => setAssetForm({ ...assetForm, device_type: e.target.value })}>
                    {DEVICE_TYPE_LIST.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <span className={label}>Serial number *</span>
                  <input className={input} value={assetForm.serial_number} onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })} placeholder="From device sticker" />
                </div>
                <div>
                  <span className={label}>Brand / Model</span>
                  <div className="flex gap-2">
                    <input className={input} value={assetForm.brand || ''} onChange={(e) => setAssetForm({ ...assetForm, brand: e.target.value })} placeholder="Brand" />
                    <input className={input} value={assetForm.model || ''} onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })} placeholder="Model" />
                  </div>
                </div>
                <div>
                  <span className={label}>Assigned to (employee)</span>
                  <input className={input} value={assetForm.assigned_to || ''} onChange={(e) => setAssetForm({ ...assetForm, assigned_to: e.target.value })} placeholder="Who uses this device?" />
                </div>
                <div>
                  <span className={label}>Department</span>
                  <input className={input} value={assetForm.department || ''} onChange={(e) => setAssetForm({ ...assetForm, department: e.target.value })} placeholder="Accounts / Sales / Admin" />
                </div>
                <div>
                  <span className={label}>Status</span>
                  <select className={input} value={assetForm.status} onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}>
                    {ASSET_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <span className={label}>Location</span>
                  <input className={input} value={assetForm.location || ''} onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })} placeholder="e.g. 2nd floor, Accounts dept" />
                </div>
                <div>
                  <span className={label}>Notes</span>
                  <input className={input} value={assetForm.notes || ''} onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })} />
                </div>
                <div className="md:col-span-3 flex gap-2">
                  <button onClick={saveAsset} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>Save asset</button>
                  <button onClick={() => setAssetForm(null)} className={`${btn} bg-slate-200 hover:bg-slate-300`}>Cancel</button>
                </div>
              </div>
            )}

            <DataTable
              empty="No assets registered yet. Add your IT devices here — desktops, printers, CCTV, servers — and allot them to your employees."
              columns={[
                { key: 'asset_code', label: 'Code', width: '110px', render: (a) => <span className="font-mono font-semibold text-indigo-700">{a.asset_code}</span> },
                { key: 'device_type', label: 'Device', width: '160px' },
                { key: 'brand', label: 'Brand / Model', render: (a) => `${a.brand || ''} ${a.model || ''}`.trim() },
                { key: 'serial_number', label: 'Serial No.', width: '140px', render: (a) => <span className="font-mono text-xs">{a.serial_number}</span> },
                { key: 'assigned', label: 'Allotted To', width: '160px', render: (a) => a.assigned_to ? (<span>{a.assigned_to}{a.department && <span className="block text-xs text-slate-500">{a.department}</span>}</span>) : <span className="text-slate-400">Unallotted</span> },
                { key: 'status', label: 'Status', width: '110px', render: (a) => <span className={chip(assetStatusTone[a.status] || 'bg-slate-100 text-slate-600')}>{a.status || 'In Use'}</span> },
                { key: 'location', label: 'Location', render: (a) => <span className="text-slate-600">{a.location}</span> },
                { key: 'act', label: 'Actions', width: '120px', render: (a) => (
                  <span className="text-xs font-medium">
                    <button onClick={() => setAssetForm({ ...a })} className="text-indigo-700 hover:underline mr-2">Edit</button>
                    <button onClick={() => removeAsset(a)} className="text-red-600 hover:underline">Remove</button>
                  </span>
                ) },
              ]}
              rows={assets}
            />
          </>
        )}

        <p className="text-xs text-slate-400">
          For urgent issues you can also call our support line. Resolved tickets trigger a feedback email — your ratings directly reach management.
        </p>
      </main>
    </div>
  )
}
