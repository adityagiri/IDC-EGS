import React, { useState } from 'react'
import { supabase } from './supabase'

const input = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const btn = 'px-4 py-2 rounded-md text-sm font-medium'
const ROLES = ['admin', 'accounts', 'engineer']
const roleTone = { admin: 'bg-indigo-100 text-indigo-800', accounts: 'bg-teal-100 text-teal-800', engineer: 'bg-slate-100 text-slate-600' }

export default function TeamTab({ staff, reload, flash, session }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('engineer')

  const add = async () => {
    if (!email.trim()) return flash('Email is required')
    const { error } = await supabase.from('staff_roles').upsert({ email: email.trim().toLowerCase(), name: name.trim() || null, role })
    if (error) return flash('Save failed: ' + error.message)
    setEmail(''); setName(''); setRole('engineer')
    flash('Team member saved — now also create their login in Supabase → Authentication → Users')
    reload()
  }

  const setMemberRole = async (m, newRole) => {
    const { error } = await supabase.from('staff_roles').update({ role: newRole }).eq('email', m.email)
    if (error) return flash('Update failed: ' + error.message)
    reload()
  }

  const remove = async (m) => {
    if (m.email === session.user.email) return flash("You can't remove yourself")
    if (!window.confirm(`Remove ${m.email} from roles? Also delete their login in Supabase to fully revoke access.`)) return
    const { error } = await supabase.from('staff_roles').delete().eq('email', m.email)
    if (error) return flash('Delete failed: ' + error.message)
    reload()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <p className="text-sm font-medium mb-3">Add / update team member role</p>
        <div className="grid md:grid-cols-4 gap-3">
          <input className={input} placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={input} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className={input} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
          <button onClick={add} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>Save</button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Roles: <b>admin</b> = everything · <b>accounts</b> = expenses, tickets, reports · <b>engineer</b> = assets scan, tickets, attendance, own expenses.
          The login itself is created separately in Supabase → Authentication → Users (same email).
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <p className="px-4 py-3 border-b border-slate-200 font-medium text-sm">Team ({staff.length})</p>
        <ul className="divide-y divide-slate-100">
          {staff.map((m) => (
            <li key={m.email} className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between text-sm">
              <div>
                <p className="font-medium">{m.name || m.email}</p>
                <p className="text-xs text-slate-500">{m.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${roleTone[m.role]}`}>{m.role}</span>
                <select className="border border-slate-300 rounded-md px-2 py-1 text-xs" value={m.role} onChange={(e) => setMemberRole(m, e.target.value)}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
                <button onClick={() => remove(m)} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
