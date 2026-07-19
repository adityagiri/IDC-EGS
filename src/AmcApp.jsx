import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const VENTURES = ['IDC', 'EasyGo']
const SEGMENTS = ['Real Estate', 'Hospital / Healthcare', 'Education', 'SMB / Retail', 'Manufacturing', 'Other']
const TIERS = ['Bronze', 'Silver', 'Gold', 'Custom']
const BILLING = ['Annual', 'Half-Yearly', 'Quarterly', 'Monthly']

const ventureStyle = {
  IDC: 'bg-indigo-100 text-indigo-800',
  EasyGo: 'bg-teal-100 text-teal-800',
}

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const daysLeft = (end) => {
  if (!end) return null
  const diff = new Date(end + 'T23:59:59') - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const contractStatus = (c) => {
  const d = daysLeft(c.end_date)
  if (d === null) return { label: 'No end date', tone: 'bg-gray-100 text-gray-600' }
  if (d < 0) return { label: 'Expired', tone: 'bg-red-100 text-red-700' }
  if (d <= 30) return { label: `${d}d left — renew now`, tone: 'bg-red-100 text-red-700' }
  if (d <= 60) return { label: `${d}d left — start renewal`, tone: 'bg-amber-100 text-amber-800' }
  if (d <= 90) return { label: `${d}d left — plan QBR`, tone: 'bg-yellow-100 text-yellow-800' }
  return { label: `${d}d left`, tone: 'bg-emerald-100 text-emerald-700' }
}

const emptyCustomer = { venture: 'IDC', company: '', contact: '', phone: '', email: '', segment: 'Real Estate', notes: '' }
const emptyContract = { customer_id: '', tier: 'Silver', value: '', billing: 'Annual', start_date: '', end_date: '', scope: '' }
const emptyVisit = { customer_id: '', date: '', summary: '', engineer: '' }

export default function AmcApp({ session, onSignOut }) {
  const [customers, setCustomers] = useState([])
  const [contracts, setContracts] = useState([])
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')
  const [custForm, setCustForm] = useState(null)
  const [conForm, setConForm] = useState(null)
  const [visitForm, setVisitForm] = useState(null)
  const [filterVenture, setFilterVenture] = useState('All')
  const [notice, setNotice] = useState('')

  const flash = (msg) => {
    setNotice(msg)
    setTimeout(() => setNotice(''), 2500)
  }

  const loadAll = async () => {
    setLoading(true)
    const [c1, c2, c3] = await Promise.all([
      supabase.from('customers').select('*').order('company'),
      supabase.from('contracts').select('*').order('end_date'),
      supabase.from('visits').select('*').order('date', { ascending: false }),
    ])
    if (c1.error || c2.error || c3.error) {
      flash('Could not load data. Check your connection and refresh.')
    }
    setCustomers(c1.data || [])
    setContracts(c2.data || [])
    setVisits(c3.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  const customersById = useMemo(() => {
    const m = {}
    customers.forEach((c) => (m[c.id] = c))
    return m
  }, [customers])

  const visibleCustomers = customers.filter((c) => filterVenture === 'All' || c.venture === filterVenture)
  const visibleContracts = contracts.filter((c) => {
    const cust = customersById[c.customer_id]
    return filterVenture === 'All' || (cust && cust.venture === filterVenture)
  })

  const metrics = useMemo(() => {
    const active = visibleContracts.filter((c) => (daysLeft(c.end_date) ?? 1) >= 0)
    const acv = active.reduce((s, c) => {
      const v = Number(c.value) || 0
      const mult = { Annual: 1, 'Half-Yearly': 2, Quarterly: 4, Monthly: 12 }[c.billing] || 1
      return s + v * mult
    }, 0)
    const bucket = (lo, hi) =>
      visibleContracts.filter((c) => {
        const d = daysLeft(c.end_date)
        return d !== null && d >= lo && d <= hi
      }).length
    return {
      customers: visibleCustomers.length,
      active: active.length,
      expired: visibleContracts.filter((c) => (daysLeft(c.end_date) ?? 1) < 0).length,
      acv,
      d30: bucket(0, 30),
      d60: bucket(31, 60),
      d90: bucket(61, 90),
    }
  }, [visibleContracts, visibleCustomers])

  const renewalQueue = useMemo(
    () =>
      [...visibleContracts]
        .filter((c) => c.end_date)
        .sort((a, b) => (daysLeft(a.end_date) ?? 9999) - (daysLeft(b.end_date) ?? 9999))
        .slice(0, 12),
    [visibleContracts]
  )

  // ---------- CRUD ----------
  const saveCustomer = async () => {
    if (!custForm.company.trim()) return
    const row = { ...custForm }
    delete row.created_at
    let error
    if (row.id) {
      ;({ error } = await supabase.from('customers').update(row).eq('id', row.id))
    } else {
      delete row.id
      ;({ error } = await supabase.from('customers').insert(row))
    }
    if (error) return flash('Save failed: ' + error.message)
    setCustForm(null)
    flash('Customer saved')
    loadAll()
  }

  const deleteCustomer = async (id) => {
    if (!window.confirm('Delete this customer and all their contracts and visits?')) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) return flash('Delete failed: ' + error.message)
    flash('Customer deleted')
    loadAll()
  }

  const saveContract = async () => {
    if (!conForm.customer_id || !conForm.end_date) return
    const row = { ...conForm, value: Number(conForm.value) || 0, start_date: conForm.start_date || null }
    delete row.created_at
    let error
    if (row.id) {
      ;({ error } = await supabase.from('contracts').update(row).eq('id', row.id))
    } else {
      delete row.id
      ;({ error } = await supabase.from('contracts').insert(row))
    }
    if (error) return flash('Save failed: ' + error.message)
    setConForm(null)
    flash('Contract saved')
    loadAll()
  }

  const deleteContract = async (id) => {
    if (!window.confirm('Delete this contract?')) return
    const { error } = await supabase.from('contracts').delete().eq('id', id)
    if (error) return flash('Delete failed: ' + error.message)
    flash('Contract deleted')
    loadAll()
  }

  const saveVisit = async () => {
    if (!visitForm.customer_id || !visitForm.summary.trim()) return
    const row = { ...visitForm, date: visitForm.date || null }
    delete row.created_at
    let error
    if (row.id) {
      ;({ error } = await supabase.from('visits').update(row).eq('id', row.id))
    } else {
      delete row.id
      ;({ error } = await supabase.from('visits').insert(row))
    }
    if (error) return flash('Save failed: ' + error.message)
    setVisitForm(null)
    flash('Entry saved')
    loadAll()
  }

  const deleteVisit = async (id) => {
    const { error } = await supabase.from('visits').delete().eq('id', id)
    if (error) return flash('Delete failed: ' + error.message)
    loadAll()
  }

  // ---------- UI helpers ----------
  const input = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const label = 'block text-xs font-medium text-slate-500 mb-1'
  const btn = 'px-4 py-2 rounded-md text-sm font-medium'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap items-center gap-4 justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">AMC Command Center</h1>
            <p className="text-slate-400 text-sm">India Digital Corporation · EasyGo Solutions</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-emerald-400 h-4">{notice}</span>
            <select
              value={filterVenture}
              onChange={(e) => setFilterVenture(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm"
            >
              <option>All</option>
              {VENTURES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <div className="text-right">
              <p className="text-xs text-slate-400">{session.user.email}</p>
              <button onClick={onSignOut} className="text-xs text-indigo-300 hover:text-white">
                Sign out
              </button>
            </div>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-1">
          {[
            ['dashboard', 'Dashboard'],
            ['customers', 'Customers'],
            ['contracts', 'AMC Contracts'],
            ['visits', 'Service Log'],
          ].map(([k, t]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 text-sm rounded-t-md ${
                tab === k ? 'bg-slate-50 text-slate-900 font-medium' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <p className="text-sm text-slate-500">Loading data…</p>
        ) : (
          <>
            {tab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ['Customers', metrics.customers],
                    ['Active AMCs', metrics.active],
                    ['Annual contract value', inr(metrics.acv)],
                    ['Expired / lapsed', metrics.expired],
                  ].map(([t, v]) => (
                    <div key={t} className="bg-white rounded-lg border border-slate-200 p-4">
                      <p className="text-xs text-slate-500">{t}</p>
                      <p className="text-2xl font-semibold mt-1">{v}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['Renew in 0–30 days', metrics.d30, 'text-red-600'],
                    ['Renew in 31–60 days', metrics.d60, 'text-amber-600'],
                    ['Renew in 61–90 days', metrics.d90, 'text-yellow-600'],
                  ].map(([t, v, tone]) => (
                    <div key={t} className="bg-white rounded-lg border border-slate-200 p-4">
                      <p className="text-xs text-slate-500">{t}</p>
                      <p className={`text-2xl font-semibold mt-1 ${tone}`}>{v}</p>
                    </div>
                  ))}
                </div>

                <section className="bg-white rounded-lg border border-slate-200">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="font-medium">Renewal radar</h2>
                    <span className="text-xs text-slate-400">Sorted by expiry — work top-down every Monday</span>
                  </div>
                  {renewalQueue.length === 0 ? (
                    <p className="p-6 text-sm text-slate-500">
                      No contracts yet. Add your first AMC under the AMC Contracts tab and it will appear here with renewal countdowns.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {renewalQueue.map((c) => {
                        const cust = customersById[c.customer_id]
                        const st = contractStatus(c)
                        return (
                          <li key={c.id} className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
                            <div>
                              <p className="text-sm font-medium">{cust ? cust.company : 'Unknown customer'}</p>
                              <p className="text-xs text-slate-500">
                                {c.tier} · {c.billing} · {inr(c.value)} · ends {c.end_date}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {cust && (
                                <span className={`text-xs px-2 py-1 rounded-full ${ventureStyle[cust.venture]}`}>{cust.venture}</span>
                              )}
                              <span className={`text-xs px-2 py-1 rounded-full ${st.tone}`}>{st.label}</span>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              </div>
            )}

            {tab === 'customers' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">Customers ({visibleCustomers.length})</h2>
                  <button onClick={() => setCustForm({ ...emptyCustomer })} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>
                    Add customer
                  </button>
                </div>

                {custForm && (
                  <div className="bg-white border border-indigo-200 rounded-lg p-4 grid md:grid-cols-3 gap-3">
                    <div>
                      <span className={label}>Venture</span>
                      <select className={input} value={custForm.venture} onChange={(e) => setCustForm({ ...custForm, venture: e.target.value })}>
                        {VENTURES.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className={label}>Company *</span>
                      <input className={input} value={custForm.company} onChange={(e) => setCustForm({ ...custForm, company: e.target.value })} placeholder="e.g. Sunrise Developers LLP" />
                    </div>
                    <div>
                      <span className={label}>Segment</span>
                      <select className={input} value={custForm.segment} onChange={(e) => setCustForm({ ...custForm, segment: e.target.value })}>
                        {SEGMENTS.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className={label}>Contact person</span>
                      <input className={input} value={custForm.contact || ''} onChange={(e) => setCustForm({ ...custForm, contact: e.target.value })} />
                    </div>
                    <div>
                      <span className={label}>Phone</span>
                      <input className={input} value={custForm.phone || ''} onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })} />
                    </div>
                    <div>
                      <span className={label}>Email</span>
                      <input className={input} value={custForm.email || ''} onChange={(e) => setCustForm({ ...custForm, email: e.target.value })} />
                    </div>
                    <div className="md:col-span-3">
                      <span className={label}>Notes (sites, infra, decision maker)</span>
                      <textarea className={input} rows={2} value={custForm.notes || ''} onChange={(e) => setCustForm({ ...custForm, notes: e.target.value })} />
                    </div>
                    <div className="md:col-span-3 flex gap-2">
                      <button onClick={saveCustomer} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>
                        Save customer
                      </button>
                      <button onClick={() => setCustForm(null)} className={`${btn} bg-slate-200 hover:bg-slate-300`}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg border border-slate-200">
                  {visibleCustomers.length === 0 ? (
                    <p className="p-6 text-sm text-slate-500">No customers yet. Add every existing AMC client first — even informal ones.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {visibleCustomers.map((c) => (
                        <li key={c.id} className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {c.company} <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${ventureStyle[c.venture]}`}>{c.venture}</span>
                            </p>
                            <p className="text-xs text-slate-500">
                              {c.segment}
                              {c.contact ? ` · ${c.contact}` : ''}
                              {c.phone ? ` · ${c.phone}` : ''}
                              {c.email ? ` · ${c.email}` : ''}
                            </p>
                            {c.notes && <p className="text-xs text-slate-400 mt-1">{c.notes}</p>}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setCustForm({ ...c })} className="text-xs text-indigo-600 hover:underline">
                              Edit
                            </button>
                            <button onClick={() => deleteCustomer(c.id)} className="text-xs text-red-500 hover:underline">
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {tab === 'contracts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">AMC Contracts ({visibleContracts.length})</h2>
                  <button
                    onClick={() => setConForm({ ...emptyContract })}
                    className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50`}
                    disabled={customers.length === 0}
                  >
                    Add contract
                  </button>
                </div>
                {customers.length === 0 && <p className="text-sm text-slate-500">Add a customer first, then attach contracts to them.</p>}

                {conForm && (
                  <div className="bg-white border border-indigo-200 rounded-lg p-4 grid md:grid-cols-3 gap-3">
                    <div>
                      <span className={label}>Customer *</span>
                      <select className={input} value={conForm.customer_id} onChange={(e) => setConForm({ ...conForm, customer_id: e.target.value })}>
                        <option value="">Select…</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.company} ({c.venture})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className={label}>Tier</span>
                      <select className={input} value={conForm.tier} onChange={(e) => setConForm({ ...conForm, tier: e.target.value })}>
                        {TIERS.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className={label}>Value per billing cycle (₹)</span>
                      <input type="number" className={input} value={conForm.value} onChange={(e) => setConForm({ ...conForm, value: e.target.value })} />
                    </div>
                    <div>
                      <span className={label}>Billing cycle</span>
                      <select className={input} value={conForm.billing} onChange={(e) => setConForm({ ...conForm, billing: e.target.value })}>
                        {BILLING.map((b) => (
                          <option key={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className={label}>Start date</span>
                      <input type="date" className={input} value={conForm.start_date || ''} onChange={(e) => setConForm({ ...conForm, start_date: e.target.value })} />
                    </div>
                    <div>
                      <span className={label}>End date *</span>
                      <input type="date" className={input} value={conForm.end_date || ''} onChange={(e) => setConForm({ ...conForm, end_date: e.target.value })} />
                    </div>
                    <div className="md:col-span-3">
                      <span className={label}>Scope (endpoints, servers, CCTV, network, SLA)</span>
                      <textarea className={input} rows={2} value={conForm.scope || ''} onChange={(e) => setConForm({ ...conForm, scope: e.target.value })} />
                    </div>
                    <div className="md:col-span-3 flex gap-2">
                      <button onClick={saveContract} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>
                        Save contract
                      </button>
                      <button onClick={() => setConForm(null)} className={`${btn} bg-slate-200 hover:bg-slate-300`}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg border border-slate-200">
                  {visibleContracts.length === 0 ? (
                    <p className="p-6 text-sm text-slate-500">No contracts recorded yet.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {visibleContracts.map((c) => {
                        const cust = customersById[c.customer_id]
                        const st = contractStatus(c)
                        return (
                          <li key={c.id} className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                {cust ? cust.company : 'Unknown'} — {c.tier}
                              </p>
                              <p className="text-xs text-slate-500">
                                {inr(c.value)} / {c.billing} · {c.start_date || '?'} → {c.end_date}
                              </p>
                              {c.scope && <p className="text-xs text-slate-400 mt-1">{c.scope}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${st.tone}`}>{st.label}</span>
                              <button onClick={() => setConForm({ ...c })} className="text-xs text-indigo-600 hover:underline">
                                Edit
                              </button>
                              <button onClick={() => deleteContract(c.id)} className="text-xs text-red-500 hover:underline">
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
            )}

            {tab === 'visits' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">Service Log ({visits.length})</h2>
                  <button
                    onClick={() => setVisitForm({ ...emptyVisit, date: new Date().toISOString().slice(0, 10) })}
                    className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50`}
                    disabled={customers.length === 0}
                  >
                    Log a visit / ticket
                  </button>
                </div>

                {visitForm && (
                  <div className="bg-white border border-indigo-200 rounded-lg p-4 grid md:grid-cols-3 gap-3">
                    <div>
                      <span className={label}>Customer *</span>
                      <select className={input} value={visitForm.customer_id} onChange={(e) => setVisitForm({ ...visitForm, customer_id: e.target.value })}>
                        <option value="">Select…</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.company}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className={label}>Date</span>
                      <input type="date" className={input} value={visitForm.date || ''} onChange={(e) => setVisitForm({ ...visitForm, date: e.target.value })} />
                    </div>
                    <div>
                      <span className={label}>Engineer</span>
                      <input className={input} value={visitForm.engineer || ''} onChange={(e) => setVisitForm({ ...visitForm, engineer: e.target.value })} />
                    </div>
                    <div className="md:col-span-3">
                      <span className={label}>What was done *</span>
                      <textarea className={input} rows={2} value={visitForm.summary || ''} onChange={(e) => setVisitForm({ ...visitForm, summary: e.target.value })} />
                    </div>
                    <div className="md:col-span-3 flex gap-2">
                      <button onClick={saveVisit} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>
                        Save entry
                      </button>
                      <button onClick={() => setVisitForm(null)} className={`${btn} bg-slate-200 hover:bg-slate-300`}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg border border-slate-200">
                  {visits.length === 0 ? (
                    <p className="p-6 text-sm text-slate-500">
                      Log every visit and remote fix here. At renewal time, this list is your proof of value — show it to the client before quoting.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {visits.map((v) => {
                        const cust = customersById[v.customer_id]
                        return (
                          <li key={v.id} className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                {cust ? cust.company : 'Unknown'} · {v.date}
                              </p>
                              <p className="text-xs text-slate-500">
                                {v.summary}
                                {v.engineer ? ` — ${v.engineer}` : ''}
                              </p>
                            </div>
                            <button onClick={() => deleteVisit(v.id)} className="text-xs text-red-500 hover:underline">
                              Delete
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
