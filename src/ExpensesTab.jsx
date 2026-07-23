import React, { useMemo, useState } from 'react'
import { supabase } from './supabase'

const input = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const label = 'block text-xs font-medium text-slate-500 mb-1'
const btn = 'px-4 py-2 rounded-md text-sm font-medium'

export const TRAVEL_MODES = ['Bus', 'Train', 'Metro', 'Auto / Taxi', 'Own Vehicle', 'Flight', 'Other']

const statusTone = {
  Pending: 'bg-amber-100 text-amber-800',
  Approved: 'bg-blue-100 text-blue-700',
  Rejected: 'bg-red-100 text-red-700',
  Paid: 'bg-emerald-100 text-emerald-700',
}

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const emptyExpense = { date: new Date().toISOString().slice(0, 10), customer_id: '', from_location: '', to_location: '', travel_mode: 'Bus', amount: '', notes: '' }

export default function ExpensesTab({ customers, expenses, reload, flash, session, role }) {
  const [form, setForm] = useState(null)
  const [filterEng, setFilterEng] = useState('All')
  const [filterMonth, setFilterMonth] = useState('All')

  const isMgmt = role === 'admin' || role === 'accounts'
  const me = session.user.email

  const customersById = useMemo(() => {
    const m = {}
    customers.forEach((c) => (m[c.id] = c))
    return m
  }, [customers])

  const engineers = useMemo(() => [...new Set(expenses.map((e) => e.engineer))], [expenses])
  const months = useMemo(() => [...new Set(expenses.map((e) => (e.date || '').slice(0, 7)))].sort().reverse(), [expenses])

  const visible = expenses.filter(
    (e) => (filterEng === 'All' || e.engineer === filterEng) && (filterMonth === 'All' || (e.date || '').startsWith(filterMonth))
  )
  const totalVisible = visible.reduce((s, e) => s + Number(e.amount || 0), 0)
  const pendingApproval = expenses.filter((e) => e.status === 'Pending').length

  const save = async () => {
    if (!form.amount || !form.date) return flash('Date and amount are required')
    const row = { ...form, amount: Number(form.amount) || 0, customer_id: form.customer_id || null }
    delete row.created_at
    let error
    if (row.id) ({ error } = await supabase.from('expenses').update(row).eq('id', row.id))
    else {
      delete row.id
      row.engineer = me
      row.status = 'Pending'
      ;({ error } = await supabase.from('expenses').insert(row))
    }
    if (error) return flash('Save failed: ' + error.message)
    setForm(null)
    flash('Expense submitted for approval')
    reload()
  }

  const setStatus = async (e, status) => {
    const patch = { status }
    if (status === 'Approved' || status === 'Rejected') {
      patch.approved_by = me
      patch.approved_at = new Date().toISOString()
    }
    if (status === 'Paid') patch.paid_at = new Date().toISOString()
    const { error } = await supabase.from('expenses').update(patch).eq('id', e.id)
    if (error) return flash('Update failed: ' + error.message)
    flash(`Expense ${status.toLowerCase()}`)
    reload()
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this expense entry?')) return
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) return flash('Delete failed: ' + error.message)
    reload()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h2 className="font-medium">Expenses</h2>
          <p className="text-xs text-slate-500">
            Showing {visible.length} entries · Total {inr(totalVisible)}
            {isMgmt && pendingApproval > 0 && <span className="text-amber-600 font-medium"> · {pendingApproval} awaiting approval</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isMgmt && (
            <>
              <select className={input + ' w-auto'} value={filterEng} onChange={(e) => setFilterEng(e.target.value)}>
                <option value="All">All engineers</option>
                {engineers.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
              <select className={input + ' w-auto'} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                <option value="All">All months</option>
                {months.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </>
          )}
          <button onClick={() => setForm({ ...emptyExpense })} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>
            Add expense
          </button>
        </div>
      </div>

      {form && (
        <div className="bg-white border border-indigo-200 rounded-lg p-4 grid md:grid-cols-3 gap-3">
          <div>
            <span className={label}>Date *</span>
            <input type="date" className={input} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <span className={label}>Customer / site (optional)</span>
            <select className={input} value={form.customer_id || ''} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">Not site-related</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>Travel mode</span>
            <select className={input} value={form.travel_mode} onChange={(e) => setForm({ ...form, travel_mode: e.target.value })}>
              {TRAVEL_MODES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>From</span>
            <input className={input} value={form.from_location || ''} onChange={(e) => setForm({ ...form, from_location: e.target.value })} placeholder="e.g. Borivali" />
          </div>
          <div>
            <span className={label}>To</span>
            <input className={input} value={form.to_location || ''} onChange={(e) => setForm({ ...form, to_location: e.target.value })} placeholder="e.g. Andheri client site" />
          </div>
          <div>
            <span className={label}>Amount (₹) *</span>
            <input type="number" className={input} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <span className={label}>Notes</span>
            <input className={input} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ticket no. / reason" />
          </div>
          <div className="md:col-span-3 flex gap-2">
            <button onClick={save} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>
              Submit
            </button>
            <button onClick={() => setForm(null)} className={`${btn} bg-slate-200 hover:bg-slate-300`}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200">
        {visible.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            No expenses yet. Engineers add travel expenses here; they go to management for approval, then accounts marks them paid.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((e) => (
              <li key={e.id} className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between text-sm">
                <div>
                  <p className="font-medium">
                    {inr(e.amount)} — {e.travel_mode} {e.from_location ? `· ${e.from_location} → ${e.to_location || '?'}` : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    {e.date} · {e.engineer}
                    {e.customer_id && customersById[e.customer_id] ? ` · ${customersById[e.customer_id].company}` : ''}
                    {e.approved_by ? ` · ${e.status === 'Rejected' ? 'rejected' : 'approved'} by ${e.approved_by}` : ''}
                  </p>
                  {e.notes && <p className="text-xs text-slate-400 mt-0.5">{e.notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded-full ${statusTone[e.status] || ''}`}>{e.status}</span>
                  {isMgmt && e.status === 'Pending' && (
                    <>
                      <button onClick={() => setStatus(e, 'Approved')} className="text-xs text-emerald-600 hover:underline">
                        Approve
                      </button>
                      <button onClick={() => setStatus(e, 'Rejected')} className="text-xs text-red-500 hover:underline">
                        Reject
                      </button>
                    </>
                  )}
                  {isMgmt && e.status === 'Approved' && (
                    <button onClick={() => setStatus(e, 'Paid')} className="text-xs text-emerald-700 hover:underline">
                      Mark paid
                    </button>
                  )}
                  {(e.engineer === me && e.status === 'Pending') && (
                    <button onClick={() => setForm({ ...e })} className="text-xs text-indigo-600 hover:underline">
                      Edit
                    </button>
                  )}
                  {(role === 'admin' || (e.engineer === me && e.status === 'Pending')) && (
                    <button onClick={() => remove(e.id)} className="text-xs text-red-500 hover:underline">
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
