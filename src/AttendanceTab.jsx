import React, { useMemo, useState } from 'react'
import { supabase } from './supabase'
import { DataTable } from './ui'

const input = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const btn = 'px-4 py-2 rounded-md text-sm font-medium'

const getPosition = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  })

const fmtTime = (ts) => (ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—')
const fmtDate = (ts) => (ts ? new Date(ts).toLocaleDateString('en-IN') : '')

export default function AttendanceTab({ customers, attendance, reload, flash, session }) {
  const [customerId, setCustomerId] = useState('')
  const [busy, setBusy] = useState(false)

  const customersById = useMemo(() => {
    const m = {}
    customers.forEach((c) => (m[c.id] = c))
    return m
  }, [customers])

  const myOpen = attendance.find((a) => a.engineer === session.user.email && !a.check_out)

  const checkIn = async () => {
    setBusy(true)
    const pos = await getPosition()
    const { error } = await supabase.from('attendance').insert({
      engineer: session.user.email,
      customer_id: customerId || null,
      check_in: new Date().toISOString(),
      in_lat: pos ? pos.lat : null,
      in_lng: pos ? pos.lng : null,
    })
    setBusy(false)
    if (error) return flash('Check-in failed: ' + error.message)
    flash(pos ? 'Checked in with location ✓' : 'Checked in (location unavailable — allow GPS permission)')
    setCustomerId('')
    reload()
  }

  const checkOut = async () => {
    setBusy(true)
    const pos = await getPosition()
    const { error } = await supabase
      .from('attendance')
      .update({
        check_out: new Date().toISOString(),
        out_lat: pos ? pos.lat : null,
        out_lng: pos ? pos.lng : null,
      })
      .eq('id', myOpen.id)
    setBusy(false)
    if (error) return flash('Check-out failed: ' + error.message)
    flash('Checked out ✓')
    reload()
  }

  const mapsLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`

  return (
    <div className="space-y-4">
      {/* My action card */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <p className="text-sm font-medium mb-3">Field check-in — {session.user.email}</p>
        {myOpen ? (
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <p className="text-sm text-slate-600">
              On site at <span className="font-medium">{myOpen.customer_id ? customersById[myOpen.customer_id]?.company : 'Unspecified site'}</span>{' '}
              since {fmtTime(myOpen.check_in)}
            </p>
            <button onClick={checkOut} disabled={busy} className={`${btn} bg-red-600 text-white hover:bg-red-700 disabled:opacity-60`}>
              {busy ? 'Please wait…' : 'Check out'}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <select className={input + ' flex-1 min-w-48'} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select customer site…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company}
                </option>
              ))}
            </select>
            <button onClick={checkIn} disabled={busy} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60`}>
              {busy ? 'Getting location…' : 'Check in'}
            </button>
          </div>
        )}
        <p className="text-xs text-slate-400 mt-2">Location is captured automatically — allow GPS permission when the browser asks.</p>
      </div>

      {/* Log */}
      <DataTable
        empty="No entries yet. Engineers check in on reaching a site and check out when leaving — timings and GPS recorded automatically."
        columns={[
          { key: 'date', label: 'Date', width: '100px', render: (a) => fmtDate(a.check_in) },
          { key: 'engineer', label: 'Engineer', width: '180px', render: (a) => <span className="text-xs">{a.engineer}</span> },
          { key: 'site', label: 'Customer Site', render: (a) => a.customer_id ? customersById[a.customer_id]?.company || 'Unknown site' : 'Unspecified site' },
          { key: 'in', label: 'Check In', width: '90px', render: (a) => fmtTime(a.check_in) },
          { key: 'out', label: 'Check Out', width: '90px', render: (a) => fmtTime(a.check_out) },
          { key: 'dur', label: 'Duration', width: '110px', align: 'right', render: (a) => a.check_out ? `${Math.round((new Date(a.check_out) - new Date(a.check_in)) / 60000)} min` : <span className="text-amber-600">on site</span> },
          { key: 'gps', label: 'GPS', width: '150px', render: (a) => (
            <span className="text-xs">
              {a.in_lat && <a className="text-indigo-700 hover:underline mr-2" href={mapsLink(a.in_lat, a.in_lng)} target="_blank" rel="noreferrer">In-loc</a>}
              {a.out_lat && <a className="text-indigo-700 hover:underline" href={mapsLink(a.out_lat, a.out_lng)} target="_blank" rel="noreferrer">Out-loc</a>}
            </span>
          ) },
        ]}
        rows={attendance}
      />
    </div>
  )
}
