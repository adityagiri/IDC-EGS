import React, { useEffect, useState } from 'react'
import { supabase } from './supabase'

const input = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500'
const label = 'block text-xs font-medium text-slate-500 mb-1'
const btn = 'px-4 py-2 rounded-md text-sm font-medium'

const PORTAL_ROLES = ['portal-user', 'portal-admin']
const roleTone = { 'portal-admin': 'bg-rose-100 text-rose-800', 'portal-user': 'bg-slate-100 text-slate-600' }

export default function PortalUsersPanel({ customer, onClose, flash }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('portal-admin')

  const load = async () => {
    const { data, error } = await supabase.from('customer_users').select('*').eq('customer_id', customer.id).order('email')
    if (error) flash('Load failed: ' + error.message)
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [customer.id])

  const add = async () => {
    const e = email.trim().toLowerCase()
    if (!e || !e.includes('@') || /[\s,]/.test(e)) return flash('Enter one valid email address')
    const { error } = await supabase.from('customer_users').upsert(
      { customer_id: customer.id, email: e, name: name.trim() || null, role },
      { onConflict: 'email' }
    )
    if (error) return flash('Save failed: ' + error.message)
    setEmail('')
    setName('')
    flash('Portal login saved — now create the same email in Supabase → Authentication → Users')
    load()
  }

  const setUserRole = async (u, newRole) => {
    const { error } = await supabase.from('customer_users').update({ role: newRole }).eq('id', u.id)
    if (error) return flash('Update failed: ' + error.message)
    load()
  }

  const remove = async (u) => {
    if (!window.confirm(`Remove portal access for ${u.email}? Also delete their login in Supabase → Authentication to fully revoke it.`)) return
    const { error } = await supabase.from('customer_users').delete().eq('id', u.id)
    if (error) return flash('Delete failed: ' + error.message)
    load()
  }

  return (
    <div className="bg-white border-2 border-rose-300 rounded-md p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-800">Portal logins — {customer.company}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Extra logins for this customer only. <b>portal-user</b> = raise tickets, manage own assets.{' '}
            <b>portal-admin</b> = on-site FMS: can also assign, work, resolve and escalate this company's tickets.
            They can never see any other customer's data.
          </p>
        </div>
        <button onClick={onClose} className="text-xs text-slate-500 hover:underline">Close</button>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <div>
          <span className={label}>Email (their login)</span>
          <input className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="fms@customer.com" />
        </div>
        <div>
          <span className={label}>Name</span>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="On-site engineer" />
        </div>
        <div>
          <span className={label}>Portal role</span>
          <select className={input} value={role} onChange={(e) => setRole(e.target.value)}>
            {PORTAL_ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={add} className={`${btn} w-full bg-rose-600 text-white hover:bg-rose-700`}>Add login</button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">
          No extra logins yet. The company email on the customer record ({customer.email || 'not set'}) always works as a portal-user.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md">
          {rows.map((u) => (
            <li key={u.id} className="px-3 py-2 flex flex-wrap items-center gap-3 justify-between text-sm">
              <div>
                <p className="font-medium">{u.name || u.email}</p>
                <p className="text-xs text-slate-500">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${roleTone[u.role] || ''}`}>{u.role}</span>
                <select className="border border-slate-300 rounded-md px-2 py-1 text-xs" value={u.role} onChange={(e) => setUserRole(u, e.target.value)}>
                  {PORTAL_ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
                <button onClick={() => remove(u)} className="text-xs text-red-600 hover:underline">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-400">
        Two steps, same as staff: add the login here, then create the identical email in Supabase → Authentication → Users so they can set a password.
      </p>
    </div>
  )
}
