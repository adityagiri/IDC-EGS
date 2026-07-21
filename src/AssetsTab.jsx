import React, { useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from './supabase'
import { DEVICE_TYPE_LIST } from './checklists'

const input = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const label = 'block text-xs font-medium text-slate-500 mb-1'
const btn = 'px-4 py-2 rounded-md text-sm font-medium'

const emptyAsset = {
  customer_id: '',
  device_type: 'Desktop / Laptop',
  brand: '',
  model: '',
  serial_number: '',
  location: '',
  notes: '',
}

export default function AssetsTab({ customers, assets, reload, flash }) {
  const [form, setForm] = useState(null)
  const [filterCustomer, setFilterCustomer] = useState('All')

  const customersById = useMemo(() => {
    const m = {}
    customers.forEach((c) => (m[c.id] = c))
    return m
  }, [customers])

  const visible = assets.filter((a) => filterCustomer === 'All' || a.customer_id === filterCustomer)

  const nextCode = (venture) => {
    const prefix = venture === 'EasyGo' ? 'EGS' : 'IDC'
    const nums = assets
      .filter((a) => a.asset_code && a.asset_code.startsWith(prefix + '-'))
      .map((a) => parseInt(a.asset_code.split('-')[1], 10) || 0)
    const n = (nums.length ? Math.max(...nums) : 0) + 1
    return `${prefix}-${String(n).padStart(4, '0')}`
  }

  const save = async () => {
    if (!form.customer_id || !form.serial_number.trim()) {
      flash('Customer and serial number are required')
      return
    }
    const row = { ...form }
    delete row.created_at
    let error
    if (row.id) {
      ;({ error } = await supabase.from('assets').update(row).eq('id', row.id))
    } else {
      delete row.id
      const cust = customersById[row.customer_id]
      row.asset_code = nextCode(cust ? cust.venture : 'IDC')
      ;({ error } = await supabase.from('assets').insert(row))
    }
    if (error) return flash('Save failed: ' + error.message)
    setForm(null)
    flash('Asset saved')
    reload()
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this asset and its service history?')) return
    const { error } = await supabase.from('assets').delete().eq('id', id)
    if (error) return flash('Delete failed: ' + error.message)
    reload()
  }

  const printLabel = async (asset) => {
    const cust = customersById[asset.customer_id]
    const url = `${window.location.origin}/#/asset/${asset.asset_code}`
    const qr = await QRCode.toDataURL(url, { width: 260, margin: 1 })
    const w = window.open('', '_blank', 'width=420,height=520')
    if (!w) return flash('Popup blocked — allow popups for this site')
    w.document.write(`
      <html><head><title>${asset.asset_code}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 12px; }
        .lbl { width: 62mm; border: 1.5px solid #000; border-radius: 6px; padding: 8px; text-align: center; }
        .code { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
        .co { font-size: 10px; margin-top: 2px; }
        .sn { font-size: 9px; margin-top: 2px; word-break: break-all; }
        .warn { font-size: 8.5px; margin-top: 4px; border-top: 1px solid #000; padding-top: 3px; }
        img { width: 40mm; height: 40mm; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="lbl">
        <div class="code">${asset.asset_code}</div>
        <img src="${qr}" />
        <div class="co">${cust ? (cust.venture === 'EasyGo' ? 'EasyGo Solutions' : 'India Digital Corporation') : ''} · AMC Asset</div>
        <div class="sn">S/N: ${asset.serial_number || '-'}</div>
        <div class="warn">Scan before every service. Do not remove this label.</div>
      </div>
      <script>window.onload = () => setTimeout(() => window.print(), 300)<\/script>
      </body></html>`)
    w.document.close()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h2 className="font-medium">Assets ({visible.length})</h2>
        <div className="flex gap-2">
          <select className={input + ' w-auto'} value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)}>
            <option value="All">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company}
              </option>
            ))}
          </select>
          <button
            onClick={() => setForm({ ...emptyAsset })}
            className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50`}
            disabled={customers.length === 0}
          >
            Add asset
          </button>
        </div>
      </div>

      {form && (
        <div className="bg-white border border-indigo-200 rounded-lg p-4 grid md:grid-cols-3 gap-3">
          <div>
            <span className={label}>Customer *</span>
            <select className={input} value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">Select…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company} ({c.venture})
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>Device type</span>
            <select className={input} value={form.device_type} onChange={(e) => setForm({ ...form, device_type: e.target.value })}>
              {DEVICE_TYPE_LIST.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>Serial number *</span>
            <input className={input} value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} placeholder="From device sticker" />
          </div>
          <div>
            <span className={label}>Brand</span>
            <input className={input} value={form.brand || ''} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="HP / Dell / Hikvision…" />
          </div>
          <div>
            <span className={label}>Model</span>
            <input className={input} value={form.model || ''} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </div>
          <div>
            <span className={label}>Location at site</span>
            <input className={input} value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Accounts dept, 2nd floor" />
          </div>
          <div className="md:col-span-3">
            <span className={label}>Notes</span>
            <textarea className={input} rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="md:col-span-3 flex gap-2">
            <button onClick={save} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>
              Save asset
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
            No assets yet. Register every customer device here — each gets a unique code and a printable QR label. Stick the label on the machine; engineers scan it on site to see AMC status and file the service report.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((a) => {
              const cust = customersById[a.customer_id]
              return (
                <li key={a.id} className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700">{a.asset_code}</span>{' '}
                      {a.device_type} {a.brand ? `· ${a.brand}` : ''} {a.model || ''}
                    </p>
                    <p className="text-xs text-slate-500">
                      {cust ? cust.company : 'Unknown'} · S/N {a.serial_number}
                      {a.location ? ` · ${a.location}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`#/asset/${a.asset_code}`} className="text-xs text-emerald-700 hover:underline">
                      Open
                    </a>
                    <button onClick={() => printLabel(a)} className="text-xs text-indigo-600 hover:underline">
                      Print QR label
                    </button>
                    <button onClick={() => setForm({ ...a })} className="text-xs text-indigo-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => remove(a.id)} className="text-xs text-red-500 hover:underline">
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
