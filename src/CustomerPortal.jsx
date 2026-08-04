import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { DataTable, chip } from './ui'

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

const fmtDT = (ts) =>
  ts ? new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

export default function CustomerPortal({ customer, session, onSignOut }) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [notice, setNotice] = useState('')

  const flash = (m) => {
    setNotice(m)
    setTimeout(() => setNotice(''), 3000)
  }

  const load = async () => {
    const { data } = await supabase.from('tickets').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false })
    setTickets(data || [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const stats = useMemo(() => {
    const resolved = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length
    return { raised: tickets.length, resolved, pending: tickets.length - resolved }
  }, [tickets])

  const submit = async () => {
    if (!form.title.trim()) return flash('Please describe the issue in the title')
    const { error } = await supabase.from('tickets').insert({
      customer_id: customer.id,
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      status: 'Open',
      created_by: session.user.email,
    })
    if (error) return flash('Could not submit: ' + error.message)
    setForm(null)
    flash('Ticket submitted — our team has been notified ✓')
    load()
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-900 text-white border-b-4 border-indigo-600">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">SUPPORT PORTAL</h1>
            <p className="text-slate-400 text-xs">{customer.company} · India Digital Corporation / EasyGo Solutions</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-300">{session.user.email}</p>
            <button onClick={onSignOut} className="text-xs text-indigo-300 hover:text-white">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        {notice && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">{notice}</p>}

        <div className="grid grid-cols-3 gap-px bg-slate-300 border border-slate-300 rounded-md overflow-hidden">
          {[
            ['Tickets Raised', stats.raised, ''],
            ['Resolved', stats.resolved, 'text-emerald-600'],
            ['Pending', stats.pending, stats.pending > 0 ? 'text-red-600' : ''],
          ].map(([t, v, tone]) => (
            <div key={t} className="bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t}</p>
              <p className={`text-2xl font-semibold mt-1 tabular-nums ${tone}`}>{v}</p>
            </div>
          ))}
        </div>

        {!form ? (
          <button onClick={() => setForm({ title: '', description: '', priority: 'Medium' })} className={`${btn} w-full md:w-auto bg-indigo-600 text-white hover:bg-indigo-700 py-3`}>
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
                {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <span className={label}>Details (location, error message, since when…)</span>
              <textarea className={input} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="md:col-span-3 flex gap-2">
              <button onClick={submit} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>Submit ticket</button>
              <button onClick={() => setForm(null)} className={`${btn} bg-slate-200 hover:bg-slate-300`}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading your tickets…</p>
        ) : (
          <DataTable
            empty="No tickets yet. Raise one above whenever you face an IT issue — our team is notified instantly."
            columns={[
              { key: 'created_at', label: 'Raised On', width: '150px', render: (t) => fmtDT(t.created_at) },
              { key: 'title', label: 'Issue', render: (t) => (<span><span className="font-medium">{t.title}</span>{t.description && <span className="block text-xs text-slate-500 mt-0.5">{t.description}</span>}</span>) },
              { key: 'priority', label: 'Urgency', width: '90px' },
              { key: 'status', label: 'Status', width: '110px', render: (t) => <span className={chip(statusTone[t.status] || '')}>{t.status}</span> },
              { key: 'resolved_at', label: 'Resolved On', width: '150px', render: (t) => fmtDT(t.resolved_at) },
            ]}
            rows={tickets}
          />
        )}

        <p className="text-xs text-slate-400">
          For urgent issues you can also call our support line. Resolved tickets trigger a feedback email — your ratings directly reach management.
        </p>
      </main>
    </div>
  )
}
