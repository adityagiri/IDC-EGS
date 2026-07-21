import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { DEVICE_TYPES, RESULT_OPTIONS, ISSUE_OPTIONS } from './checklists'

const input = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const label = 'block text-xs font-medium text-slate-500 mb-1'
const btn = 'px-4 py-2 rounded-md text-sm font-medium'

const daysLeft = (end) => {
  if (!end) return null
  return Math.ceil((new Date(end + 'T23:59:59') - new Date()) / 86400000)
}

export default function AssetPage({ code, session }) {
  const [asset, setAsset] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [contracts, setContracts] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState('')

  const [checks, setChecks] = useState({})
  const [result, setResult] = useState(RESULT_OPTIONS[0])
  const [issue, setIssue] = useState(ISSUE_OPTIONS[0])
  const [parts, setParts] = useState('')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)

  const flash = (m) => {
    setNotice(m)
    setTimeout(() => setNotice(''), 3000)
  }

  const load = async () => {
    setLoading(true)
    const { data: a } = await supabase.from('assets').select('*').eq('asset_code', code).maybeSingle()
    if (!a) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setAsset(a)
    const [c, k, r] = await Promise.all([
      supabase.from('customers').select('*').eq('id', a.customer_id).maybeSingle(),
      supabase.from('contracts').select('*').eq('customer_id', a.customer_id),
      supabase.from('service_reports').select('*').eq('asset_id', a.id).order('date', { ascending: false }),
    ])
    setCustomer(c.data)
    setContracts(k.data || [])
    setReports(r.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [code])

  const amc = useMemo(() => {
    const active = contracts
      .filter((c) => (daysLeft(c.end_date) ?? -1) >= 0)
      .sort((a, b) => (daysLeft(b.end_date) ?? 0) - (daysLeft(a.end_date) ?? 0))[0]
    return active || null
  }, [contracts])

  const lastReport = reports[0] || null
  const checklist = asset ? DEVICE_TYPES[asset.device_type] || DEVICE_TYPES['Other'] : []

  const startService = () => {
    const init = {}
    checklist.forEach((item) => (init[item] = false))
    setChecks(init)
    setResult(RESULT_OPTIONS[0])
    setIssue(ISSUE_OPTIONS[0])
    setParts('')
    setRemarks('')
    setShowForm(true)
  }

  const submit = async () => {
    setSaving(true)
    const { error } = await supabase.from('service_reports').insert({
      asset_id: asset.id,
      customer_id: asset.customer_id,
      engineer: session.user.email,
      date: new Date().toISOString().slice(0, 10),
      checklist: checks,
      result,
      issue_category: issue,
      parts_replaced: parts || null,
      remarks: remarks || null,
    })
    setSaving(false)
    if (error) return flash('Submit failed: ' + error.message)
    setShowForm(false)
    flash('Service report submitted ✓')
    load()
  }

  if (loading)
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading asset {code}…</div>

  if (notFound)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white border border-red-200 rounded-lg p-6 max-w-sm text-center">
          <p className="text-lg font-semibold text-red-600">Asset {code} not found</p>
          <p className="text-sm text-slate-500 mt-2">
            This QR is not registered in the system. Do not service under AMC — contact the office before proceeding.
          </p>
          <a href="#/" className="inline-block mt-4 text-sm text-indigo-600 hover:underline">
            ← Back to dashboard
          </a>
        </div>
      </div>
    )

  const underAmc = !!amc
  const d = amc ? daysLeft(amc.end_date) : null

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="bg-slate-900 text-white px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <p className="font-mono text-lg font-semibold">{asset.asset_code}</p>
            <p className="text-slate-400 text-xs">{customer ? customer.company : ''}</p>
          </div>
          <a href="#/" className="text-xs text-indigo-300 hover:text-white">
            Dashboard
          </a>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {notice && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">{notice}</p>}

        {/* AMC STATUS — the big verdict */}
        <div
          className={`rounded-lg p-4 text-center border-2 ${
            underAmc ? 'bg-emerald-50 border-emerald-400' : 'bg-red-50 border-red-400'
          }`}
        >
          <p className={`text-xl font-bold ${underAmc ? 'text-emerald-700' : 'text-red-700'}`}>
            {underAmc ? '✔ UNDER AMC' : '✖ NOT UNDER AMC'}
          </p>
          <p className="text-sm mt-1 text-slate-600">
            {underAmc
              ? `${amc.tier} AMC valid till ${amc.end_date} (${d} days left)`
              : 'No active contract for this customer. Service is chargeable — inform the customer before starting work.'}
          </p>
        </div>

        {/* Device details */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-sm">
          <p className="font-medium">{asset.device_type} — {asset.brand} {asset.model}</p>
          <p className="text-slate-500 text-xs mt-1">S/N: {asset.serial_number}</p>
          {asset.location && <p className="text-slate-500 text-xs">Location: {asset.location}</p>}
          <p className="text-xs mt-2">
            Last service:{' '}
            {lastReport ? (
              <span className="font-medium text-slate-800">
                {lastReport.date} by {lastReport.engineer} — {lastReport.result}
              </span>
            ) : (
              <span className="text-amber-600 font-medium">Never serviced (first visit)</span>
            )}
          </p>
        </div>

        {/* Service form */}
        {!showForm ? (
          <button onClick={startService} className={`${btn} w-full bg-indigo-600 text-white hover:bg-indigo-700 py-3 text-base`}>
            Start service report
          </button>
        ) : (
          <div className="bg-white rounded-lg border border-indigo-200 p-4 space-y-4">
            <p className="font-medium text-sm">Service checklist — tick everything you did</p>
            <div className="space-y-2">
              {checklist.map((item) => (
                <label key={item} className="flex items-start gap-3 text-sm bg-slate-50 rounded-md px-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-5 w-5 accent-indigo-600"
                    checked={!!checks[item]}
                    onChange={(e) => setChecks({ ...checks, [item]: e.target.checked })}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>

            <div>
              <span className={label}>Device condition after service</span>
              <select className={input} value={result} onChange={(e) => setResult(e.target.value)}>
                {RESULT_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <span className={label}>Issue category</span>
              <select className={input} value={issue} onChange={(e) => setIssue(e.target.value)}>
                {ISSUE_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <span className={label}>Parts replaced (if any)</span>
              <input className={input} value={parts} onChange={(e) => setParts(e.target.value)} placeholder="e.g. SMPS, HDD 1TB" />
            </div>
            <div>
              <span className={label}>Remarks (optional)</span>
              <textarea className={input} rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={submit} disabled={saving} className={`${btn} flex-1 bg-emerald-600 text-white hover:bg-emerald-700 py-3 disabled:opacity-60`}>
                {saving ? 'Submitting…' : 'Submit report'}
              </button>
              <button onClick={() => setShowForm(false)} className={`${btn} bg-slate-200 hover:bg-slate-300`}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-white rounded-lg border border-slate-200">
          <p className="px-4 py-3 border-b border-slate-200 font-medium text-sm">Service history ({reports.length})</p>
          {reports.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No reports yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {reports.map((r) => {
                const done = r.checklist ? Object.values(r.checklist).filter(Boolean).length : 0
                const total = r.checklist ? Object.keys(r.checklist).length : 0
                return (
                  <li key={r.id} className="px-4 py-3 text-sm">
                    <p className="font-medium">
                      {r.date} — {r.result}
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.engineer} · {done}/{total} checks done · {r.issue_category}
                      {r.parts_replaced ? ` · Parts: ${r.parts_replaced}` : ''}
                    </p>
                    {r.remarks && <p className="text-xs text-slate-400 mt-1">{r.remarks}</p>}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
