import React, { useMemo, useState } from 'react'
import { supabase } from './supabase'
import { TICKET_PRIORITIES, TICKET_STATUSES } from './checklists'

const input = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const label = 'block text-xs font-medium text-slate-500 mb-1'
const btn = 'px-4 py-2 rounded-md text-sm font-medium'

const prioTone = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-amber-100 text-amber-800',
  Critical: 'bg-red-100 text-red-700',
}
const statusTone = {
  Open: 'bg-red-100 text-red-700',
  'In Progress': 'bg-amber-100 text-amber-800',
  'On Hold': 'bg-slate-100 text-slate-600',
  Resolved: 'bg-emerald-100 text-emerald-700',
  Closed: 'bg-slate-200 text-slate-500',
}

const emptyTicket = { customer_id: '', asset_id: '', title: '', description: '', priority: 'Medium', status: 'Open', assigned_to: '' }

export default function TicketsTab({ customers, assets, tickets, reload, flash, session }) {
  const [form, setForm] = useState(null)
  const [showClosed, setShowClosed] = useState(false)

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

  const visible = tickets.filter((t) => showClosed || (t.status !== 'Closed' && t.status !== 'Resolved'))

  const save = async () => {
    if (!form.customer_id || !form.title.trim()) {
      flash('Customer and title are required')
      return
    }
    const row = { ...form, asset_id: form.asset_id || null }
    delete row.created_at
    let error
    if (row.id) {
      ;({ error } = await supabase.from('tickets').update(row).eq('id', row.id))
    } else {
      delete row.id
      row.created_by = session.user.email
      ;({ error } = await supabase.from('tickets').insert(row))
    }
    if (error) return flash('Save failed: ' + error.message)
    setForm(null)
    flash('Ticket saved')
    reload()
  }

  const quickStatus = async (t, status) => {
    const { error } = await supabase.from('tickets').update({ status }).eq('id', t.id)
    if (error) return flash('Update failed: ' + error.message)
    reload()
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this ticket?')) return
    const { error } = await supabase.from('tickets').delete().eq('id', id)
    if (error) return flash('Delete failed: ' + error.message)
    reload()
  }

  const customerAssets = form ? assets.filter((a) => a.customer_id === form.customer_id) : []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h2 className="font-medium">Tickets ({visible.length})</h2>
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500 flex items-center gap-1.5">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} className="accent-indigo-600" />
            Show resolved/closed
          </label>
          <button
            onClick={() => setForm({ ...emptyTicket })}
            className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50`}
            disabled={customers.length === 0}
          >
            New ticket
          </button>
        </div>
      </div>

      {form && (
        <div className="bg-white border border-indigo-200 rounded-lg p-4 grid md:grid-cols-3 gap-3">
          <div>
            <span className={label}>Customer *</span>
            <select className={input} value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value, asset_id: '' })}>
              <option value="">Select…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>Related asset (optional)</span>
            <select className={input} value={form.asset_id || ''} onChange={(e) => setForm({ ...form, asset_id: e.target.value })}>
              <option value="">None</option>
              {customerAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.asset_code} — {a.device_type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>Priority</span>
            <select className={input} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <span className={label}>Title *</span>
            <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Printer not printing — Accounts dept" />
          </div>
          <div>
            <span className={label}>Assigned engineer</span>
            <input className={input} value={form.assigned_to || ''} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder="Name / email" />
          </div>
          <div className="md:col-span-3">
            <span className={label}>Description</span>
            <textarea className={input} rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {form.id && (
            <div>
              <span className={label}>Status</span>
              <select className={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {TICKET_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
          <div className="md:col-span-3 flex gap-2">
            <button onClick={save} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>
              Save ticket
            </button>
            <button onClick={() => setForm(null)} className={`${btn} bg-slate-200 hover:bg-slate-300`}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200">
        {visible.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No open tickets. New complaints from customers get logged here and assigned to engineers.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((t) => {
              const cust = customersById[t.customer_id]
              const asset = t.asset_id ? assetsById[t.asset_id] : null
              return (
                <li key={t.id} className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-slate-500">
                      {cust ? cust.company : 'Unknown'}
                      {asset ? ` · ${asset.asset_code}` : ''}
                      {t.assigned_to ? ` · ${t.assigned_to}` : ' · Unassigned'}
                      {t.created_at ? ` · ${String(t.created_at).slice(0, 10)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded-full ${prioTone[t.priority] || ''}`}>{t.priority}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusTone[t.status] || ''}`}>{t.status}</span>
                    {t.status === 'Open' && (
                      <button onClick={() => quickStatus(t, 'In Progress')} className="text-xs text-indigo-600 hover:underline">
                        Start
                      </button>
                    )}
                    {(t.status === 'Open' || t.status === 'In Progress') && (
                      <button onClick={() => quickStatus(t, 'Resolved')} className="text-xs text-emerald-600 hover:underline">
                        Resolve
                      </button>
                    )}
                    <button onClick={() => setForm({ ...t })} className="text-xs text-indigo-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => remove(t.id)} className="text-xs text-red-500 hover:underline">
                      Delete
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
