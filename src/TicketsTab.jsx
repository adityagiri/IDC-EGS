import React, { useMemo, useState } from 'react'
import { supabase } from './supabase'
import { TICKET_PRIORITIES, TICKET_STATUSES, TICKET_CATEGORIES, slaDue } from './checklists'
import {
  Pill, STATUS_PILL, PRIORITY_PILL, Avatar, StatCard, Panel, Donut, BarList, TrendBars,
  ViewsRail, Pagination, relTime, slaClock,
} from './ui'

const input = 'border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500'
const label = 'block text-xs font-medium text-slate-500 mb-1'
const btn = 'px-4 py-2 rounded-md text-sm font-medium'
const PAGE_SIZE = 25

const emptyTicket = { customer_id: '', asset_id: '', title: '', description: '', affected_user: '', category: 'Hardware', priority: 'Medium', status: 'Open', assigned_to: '' }

export const tatDays = (t) => {
  if (!t.created_at) return null
  const end = t.resolved_at ? new Date(t.resolved_at) : new Date()
  return Math.round(((end - new Date(t.created_at)) / 86400000) * 10) / 10
}

const isOpen = (t) => t.status !== 'Resolved' && t.status !== 'Closed'
const breached = (t) => isOpen(t) && t.due_at && new Date(t.due_at) < new Date()
const ticketNo = (t) => (t.ticket_no ? 'REQ-' + String(t.ticket_no).padStart(5, '0') : '#' + String(t.id).slice(0, 6).toUpperCase())

export default function TicketsTab({ customers, assets, tickets, reload, flash, session, role }) {
  const isMgmt = role === 'admin' || role === 'accounts'
  const [form, setForm] = useState(null)
  const [view, setView] = useState('open')
  const [showInsights, setShowInsights] = useState(true)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [fStatus, setFStatus] = useState('All')
  const [fPriority, setFPriority] = useState('All')
  const [fAssignee, setFAssignee] = useState('All')
  const [fCategory, setFCategory] = useState('All')

  const customersById = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers])
  const assetsById = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets])

  const today = new Date().toISOString().slice(0, 10)
  const VIEW_FN = {
    open: (t) => isOpen(t),
    mine: (t) => isOpen(t) && (t.assigned_to || '').toLowerCase() === session.user.email.toLowerCase(),
    unassigned: (t) => isOpen(t) && !t.assigned_to,
    new: (t) => t.status === 'Open',
    progress: (t) => t.status === 'In Progress',
    hold: (t) => t.status === 'On Hold',
    high: (t) => isOpen(t) && (t.priority === 'High' || t.priority === 'Critical'),
    breached: (t) => breached(t),
    due: (t) => isOpen(t) && t.due_at && String(t.due_at).slice(0, 10) === today,
    repeat: (t) => !!t.repeat_call,
    resolved: (t) => t.status === 'Resolved' || t.status === 'Closed',
    all: () => true,
  }
  const VIEWS = [
    ['open', 'All open'],
    ['mine', 'My tickets'],
    ['unassigned', 'Unassigned'],
    ['new', 'New tickets'],
    ['progress', 'In progress'],
    ['hold', 'On hold'],
    ['high', 'High priority'],
    ['breached', 'SLA breached'],
    ['due', 'Due today'],
    ['repeat', 'Repeat calls'],
    ['resolved', 'Recently resolved'],
    ['all', 'All tickets'],
  ].map(([key, text]) => ({ key, label: text, count: tickets.filter(VIEW_FN[key]).length }))

  const inView = useMemo(() => tickets.filter(VIEW_FN[view] || VIEW_FN.open), [tickets, view])
  const assignees = useMemo(() => [...new Set(tickets.map((t) => t.assigned_to).filter(Boolean))], [tickets])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return inView.filter((t) => {
      if (fStatus !== 'All' && t.status !== fStatus) return false
      if (fPriority !== 'All' && t.priority !== fPriority) return false
      if (fCategory !== 'All' && (t.category || '') !== fCategory) return false
      if (fAssignee !== 'All' && (fAssignee === '-unassigned-' ? !!t.assigned_to : t.assigned_to !== fAssignee)) return false
      if (!needle) return true
      const hay = [ticketNo(t), t.title, t.description, t.affected_user, customersById[t.customer_id]?.company, t.assigned_to].join(' ').toLowerCase()
      return hay.includes(needle)
    })
  }, [inView, q, fStatus, fPriority, fAssignee, fCategory, customersById])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSafe = Math.min(page, pages)
  const rows = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)

  const insights = useMemo(() => {
    const byStatus = TICKET_STATUSES.map((s, i) => ({
      label: s,
      value: inView.filter((t) => t.status === s).length,
      color: ['#ef4444', '#f59e0b', '#94a3b8', '#10b981', '#cbd5e1'][i],
    }))
    const byPriority = TICKET_PRIORITIES.slice().reverse().map((p, i) => ({
      label: p,
      value: inView.filter((t) => t.priority === p).length,
      color: ['#dc2626', '#f97316', '#3b82f6', '#94a3b8'][i],
    }))
    const workload = Object.entries(
      inView.reduce((m, t) => {
        const k = t.assigned_to || 'Unassigned'
        m[k] = (m[k] || 0) + 1
        return m
      }, {})
    ).map(([k, value]) => ({ label: k.replace(/@.*/, ''), value })).sort((a, b) => b.value - a.value).slice(0, 6)
    const cats = Object.entries(
      inView.reduce((m, t) => {
        const k = t.category || 'Uncategorised'
        m[k] = (m[k] || 0) + 1
        return m
      }, {})
    ).map(([k, value]) => ({ label: k, value })).sort((a, b) => b.value - a.value).slice(0, 6)
    const days = [...Array(14)].map((_, i) => {
      const d = new Date(Date.now() - (13 - i) * 86400000)
      const key = d.toISOString().slice(0, 10)
      return {
        label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        created: tickets.filter((t) => String(t.created_at || '').slice(0, 10) === key).length,
        resolved: tickets.filter((t) => String(t.resolved_at || '').slice(0, 10) === key).length,
      }
    })
    const closedTats = inView.filter((t) => t.resolved_at).map(tatDays)
    return {
      byStatus, byPriority, workload, cats, days,
      total: inView.length,
      unassigned: inView.filter((t) => isOpen(t) && !t.assigned_to).length,
      breached: inView.filter(breached).length,
      dueToday: inView.filter((t) => isOpen(t) && t.due_at && String(t.due_at).slice(0, 10) === today).length,
      aging: inView.filter((t) => isOpen(t) && (tatDays(t) || 0) > 7).length,
      avgTat: closedTats.length ? Math.round((closedTats.reduce((s, x) => s + x, 0) / closedTats.length) * 10) / 10 : null,
    }
  }, [inView, tickets, today])

  const save = async () => {
    if (!form.customer_id || !form.title.trim()) return flash('Customer and title are required')
    const row = { ...form, asset_id: form.asset_id || null }
    delete row.created_at
    delete row.ticket_no
    let error
    if (row.id) ({ error } = await supabase.from('tickets').update(row).eq('id', row.id))
    else {
      delete row.id
      row.created_by = session.user.email
      row.channel = 'Office'
      row.due_at = slaDue(row.priority)
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
      const fb = window.prompt(
        'Send the resolution + feedback form to which email ID?\n(The end user who faced the issue — leave blank to send to the customer main + CC emails. Cancel = do not resolve yet.)',
        t.feedback_email || ''
      )
      if (fb === null) return
      if (fb.trim()) patch.feedback_email = fb.trim()
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

  const remove = async (id) => {
    if (!window.confirm('Delete this ticket?')) return
    const { error } = await supabase.from('tickets').delete().eq('id', id)
    if (error) return flash('Delete failed: ' + error.message)
    reload()
  }

  const customerAssets = form ? assets.filter((a) => a.customer_id === form.customer_id) : []
  const th = 'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 whitespace-nowrap'
  const td = 'px-3 py-2.5 border-b border-slate-100 align-top'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{filtered.length} tickets in this view</p>
        <button onClick={() => setForm({ ...emptyTicket })} disabled={customers.length === 0}
          className={`${btn} bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50`}>
          + New ticket
        </button>
      </div>

      {form && (
        <div className="bg-white border border-rose-300 rounded-lg p-4 grid md:grid-cols-3 gap-3">
          <div>
            <span className={label}>Customer *</span>
            <select className={input + ' w-full'} value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value, asset_id: '' })}>
              <option value="">Select…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
          </div>
          <div>
            <span className={label}>Related asset (optional)</span>
            <select className={input + ' w-full'} value={form.asset_id || ''} onChange={(e) => setForm({ ...form, asset_id: e.target.value })}>
              <option value="">None</option>
              {customerAssets.map((a) => <option key={a.id} value={a.id}>{a.asset_code} — {a.device_type}</option>)}
            </select>
          </div>
          <div>
            <span className={label}>Priority</span>
            <select className={input + ' w-full'} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {TICKET_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <span className={label}>Title *</span>
            <input className={input + ' w-full'} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Printer not printing — Accounts dept" />
          </div>
          <div>
            <span className={label}>Category</span>
            <select className={input + ' w-full'} value={form.category || 'Hardware'} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {TICKET_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <span className={label}>Raised for (end user name)</span>
            <input className={input + ' w-full'} value={form.affected_user || ''} onChange={(e) => setForm({ ...form, affected_user: e.target.value })} placeholder="e.g. Ramesh — Accounts" />
          </div>
          <div>
            <span className={label}>Assigned engineer</span>
            <input className={input + ' w-full'} value={form.assigned_to || ''} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder="Name / email" />
          </div>
          {form.id && (
            <div>
              <span className={label}>Status</span>
              <select className={input + ' w-full'} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {TICKET_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div className="md:col-span-3">
            <span className={label}>Description</span>
            <textarea className={input + ' w-full'} rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="md:col-span-3 flex gap-2">
            <button onClick={save} className={`${btn} bg-rose-600 text-white hover:bg-rose-700`}>Save ticket</button>
            <button onClick={() => setForm(null)} className={`${btn} bg-slate-200 hover:bg-slate-300`}>Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-5">
        <ViewsRail views={VIEWS} active={view} onPick={(v) => { setView(v); setPage(1) }} />

        <div className="flex-1 min-w-0 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200">
              <p className="text-sm font-semibold text-slate-700">
                Insights <span className="text-slate-400 font-normal">· {VIEWS.find((v) => v.key === view)?.label}</span>
              </p>
              <button onClick={() => setShowInsights(!showInsights)} className="text-xs text-slate-500 hover:text-slate-900">
                {showInsights ? 'Hide ▲' : 'Show ▼'}
              </button>
            </div>
            {showInsights && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  <StatCard label="Tickets" value={insights.total} />
                  <StatCard label="Unassigned" value={insights.unassigned} tone={insights.unassigned ? 'text-amber-600' : ''} />
                  <StatCard label="SLA breached" value={insights.breached} tone={insights.breached ? 'text-red-600' : 'text-emerald-600'} />
                  <StatCard label="Due today" value={insights.dueToday} />
                  <StatCard label="Aging > 7 days" value={insights.aging} tone={insights.aging ? 'text-red-600' : ''} />
                  <StatCard label="Avg TAT (days)" value={insights.avgTat ?? '—'} tone="text-emerald-600" />
                </div>
                <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-3">
                  <Panel title="By status"><Donut data={insights.byStatus} /></Panel>
                  <Panel title="By priority"><Donut data={insights.byPriority} /></Panel>
                  <Panel title="Engineer workload"><BarList rows={insights.workload} /></Panel>
                  <Panel title="Top categories"><BarList rows={insights.cats} /></Panel>
                </div>
                <Panel title="Created vs resolved · last 14 days"><TrendBars days={insights.days} /></Panel>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <input className={input + ' flex-1 min-w-52'} placeholder="Search ticket no, subject, customer, user…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
            <select className={input} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="All">All status</option>
              {TICKET_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select className={input} value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
              <option value="All">All priority</option>
              {TICKET_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
            <select className={input} value={fAssignee} onChange={(e) => setFAssignee(e.target.value)}>
              <option value="All">All assignee</option>
              <option value="-unassigned-">Unassigned</option>
              {assignees.map((a) => <option key={a}>{a}</option>)}
            </select>
            <select className={input} value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
              <option value="All">All category</option>
              {TICKET_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>#</th>
                  <th className={th}>Subject</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Status</th>
                  <th className={th}>Priority</th>
                  <th className={th}>Assignee</th>
                  <th className={th}>Resolution SLA</th>
                  <th className={th}>Created</th>
                  <th className={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">No tickets in this view.</td></tr>
                ) : (
                  rows.map((t) => {
                    const sla = slaClock(t.due_at, !isOpen(t))
                    const sp = STATUS_PILL[t.status] || STATUS_PILL.Open
                    const pp = PRIORITY_PILL[t.priority] || PRIORITY_PILL.Medium
                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className={td + ' font-mono text-xs text-slate-500 whitespace-nowrap'}>{ticketNo(t)}</td>
                        <td className={td + ' min-w-64'}>
                          <p className="font-medium text-slate-900">{t.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {[t.category, t.asset_id ? assetsById[t.asset_id]?.asset_code : null, t.channel].filter(Boolean).join(' · ')}
                          </p>
                          {t.affected_user && <p className="text-xs text-rose-700 mt-0.5">For: {t.affected_user}</p>}
                          {t.repeat_call && <span className="inline-block mt-1"><Pill text="REPEAT" tone="bg-purple-50 text-purple-700 border-purple-200" dot="bg-purple-500" /></span>}
                          {t.resolved_side === 'Customer FMS' && <span className="inline-block mt-1 ml-1"><Pill text="CUSTOMER FMS" tone="bg-amber-50 text-amber-800 border-amber-200" /></span>}
                        </td>
                        <td className={td + ' text-slate-700'}>{customersById[t.customer_id]?.company || 'Unknown'}</td>
                        <td className={td}><Pill text={t.status} tone={sp.tone} dot={sp.dot} /></td>
                        <td className={td}><Pill text={t.priority} tone={pp.tone} dot={pp.dot} /></td>
                        <td className={td + ' text-xs text-slate-600 max-w-36'}>
                          {t.assigned_to ? <Avatar name={t.assigned_to} /> : <span className="text-slate-400">Unassigned</span>}
                          {t.resolved_by && <span className="block text-slate-400 mt-1 truncate">Closed: {t.resolved_by.replace(/@.*/, '')}</span>}
                        </td>
                        <td className={td + ' whitespace-nowrap text-xs'}>
                          {sla ? (
                            <span className={sla.breached ? 'text-red-600 font-semibold' : 'text-slate-600'}>{sla.text}</span>
                          ) : <span className="text-slate-300">—</span>}
                          {t.resolved_at && <span className="block text-emerald-700 mt-0.5">{tatDays(t)}d taken</span>}
                        </td>
                        <td className={td + ' text-xs text-slate-500 whitespace-nowrap'}>{relTime(t.created_at)}</td>
                        <td className={td + ' text-xs font-medium whitespace-nowrap'}>
                          {t.status === 'Open' && <button onClick={() => quickStatus(t, 'In Progress')} className="text-rose-700 hover:underline mr-2">Start</button>}
                          {isOpen(t) && <button onClick={() => quickStatus(t, 'Resolved')} className="text-emerald-700 hover:underline mr-2">Resolve</button>}
                          {isMgmt && <button onClick={() => toggleRepeat(t)} className="text-purple-700 hover:underline mr-2">{t.repeat_call ? 'Un-repeat' : 'Repeat'}</button>}
                          <button onClick={() => setForm({ ...t })} className="text-slate-600 hover:underline mr-2">Edit</button>
                          <button onClick={() => remove(t.id)} className="text-red-600 hover:underline">Delete</button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={pageSafe} pages={pages} total={filtered.length} shown={rows.length} onPage={setPage} />
        </div>
      </div>
    </div>
  )
}
