import React, { useMemo, useState } from 'react'
import { supabase } from './supabase'
import { TICKET_PRIORITIES, TICKET_STATUSES } from './checklists'
import { DataTable, chip } from './ui'

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

export default function TicketsTab({ customers, assets, tickets, reload, flash, session, role }) {
  const isMgmt = role === 'admin' || role === 'accounts'
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
    const patch = { status }
    if (status === 'Resolved') {
      patch.resolved_by = session.user.email
      patch.resolved_at = new Date().toISOString()
    }
    const { error } = await supabase.from('tickets').update(patch).eq('id', t.id)
    if (error) return flash('Update failed: ' + error.message)
    reload()
  }

  const toggleRepeat = async (t) => {
    const { error } = await supabase.from('tickets').update({
      repeat_call: !t.repeat_call,
      repeat_marked_by: !t.repeat_call ? session.user.email : null,
    }).eq('id', t.id)
    if (error) return flash('Update failed: ' + error.message)
    flash(!t.repeat_call ? 'Marked as repeat call' : 'Repeat mark removed')
    reload()
  }

  const fmtDT = (ts) => ts ? new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

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

      <DataTable
        empty="No open tickets. Customer complaints get logged here and assigned to engineers."
        columns={[
          { key: 'created_at', label: 'Raised', width: '130px', render: (t) => <span className="text-xs">{fmtDT(t.created_at)}</span> },
          { key: 'company', label: 'Customer', render: (t) => <span className="font-medium">{customersById[t.customer_id]?.company || 'Unknown'}</span> },
          { key: 'asset', label: 'Asset', width: '100px', render: (t) => t.asset_id ? <span className="font-mono text-xs">{assetsById[t.asset_id]?.asset_code}</span> : '' },
          { key: 'title', label: 'Issue', render: (t) => (<span>{t.title}{t.description && <span className="block text-xs text-slate-500 mt-0.5">{t.description}</span>}</span>) },
          { key: 'assigned_to', label: 'Assigned To', width: '150px', render: (t) => t.assigned_to || <span className="text-slate-400">Unassigned</span> },
          { key: 'priority', label: 'Priority', width: '90px', render: (t) => <span className={chip(prioTone[t.priority] || '')}>{t.priority}</span> },
          { key: 'status', label: 'Status', width: '110px', render: (t) => (
            <span>
              <span className={chip(statusTone[t.status] || '')}>{t.status}</span>
              {t.repeat_call && <span className="block mt-1"><span className={chip('bg-purple-100 text-purple-700')}>REPEAT</span></span>}
            </span>
          ) },
          { key: 'resolved', label: 'Resolved By', width: '150px', render: (t) => t.resolved_by ? (<span className="text-xs">{t.resolved_by}<span className="block text-slate-400">{fmtDT(t.resolved_at)}</span></span>) : '' },
          { key: 'act', label: 'Actions', width: '190px', render: (t) => (
            <span className="text-xs font-medium">
              {t.status === 'Open' && <button onClick={() => quickStatus(t, 'In Progress')} className="text-indigo-700 hover:underline mr-2">Start</button>}
              {(t.status === 'Open' || t.status === 'In Progress') && <button onClick={() => quickStatus(t, 'Resolved')} className="text-emerald-700 hover:underline mr-2">Resolve</button>}
              {isMgmt && <button onClick={() => toggleRepeat(t)} className="text-purple-700 hover:underline mr-2">{t.repeat_call ? 'Un-repeat' : 'Mark repeat'}</button>}
              <button onClick={() => setForm({ ...t })} className="text-indigo-700 hover:underline mr-2">Edit</button>
              <button onClick={() => remove(t.id)} className="text-red-600 hover:underline">Delete</button>
            </span>
          ) },
        ]}
        rows={visible}
      />
    </div>
  )
}
