import React, { useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from './supabase'
import { DEVICE_TYPE_LIST, ASSET_STATUSES } from './checklists'
import { DataTable, chip } from './ui'

const input = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const label = 'block text-xs font-medium text-slate-500 mb-1'
const btn = 'px-4 py-2 rounded-md text-sm font-medium'

const assetStatusTone = {
  'In Use': 'bg-emerald-100 text-emerald-700',
  'In Store': 'bg-blue-100 text-blue-700',
  'Under Repair': 'bg-amber-100 text-amber-800',
  Scrapped: 'bg-red-100 text-red-700',
}

const emptyAsset = {
  customer_id: '',
  device_type: 'Desktop / Laptop',
  brand: '',
  model: '',
  serial_number: '',
  location: '',
  assigned_to: '',
  department: '',
  status: 'In Use',
  purchase_date: '',
  warranty_start: '',
  warranty_till: '',
  next_service_due: '',
  vendor: '',
  invoice_no: '',
  cost: '',
  notes: '',
}

const dateOrNull = (v) => (v ? v : null)
const warrantyState = (a) => {
  if (!a.warranty_till) return null
  const d = Math.ceil((new Date(a.warranty_till + 'T23:59:59') - new Date()) / 86400000)
  return d < 0 ? { label: 'Expired ' + a.warranty_till, tone: 'text-red-600' } : { label: 'Till ' + a.warranty_till, tone: d <= 30 ? 'text-amber-600' : 'text-emerald-700' }
}

export default function AssetsTab({ customers, assets, reload, flash, role }) {
  const canDates = role === 'admin' || role === 'operations'
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
    row.purchase_date = dateOrNull(row.purchase_date)
    row.warranty_start = dateOrNull(row.warranty_start)
    row.warranty_till = dateOrNull(row.warranty_till)
    row.next_service_due = dateOrNull(row.next_service_due)
    row.cost = row.cost === '' || row.cost === null ? null : Number(row.cost)
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
      <script>window.onload = () => setTimeout(() => window.print(), 300)<\\/script>
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
            {customers.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
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
              {customers.map((c) => <option key={c.id} value={c.id}>{c.company} ({c.venture})</option>)}
            </select>
          </div>
          <div>
            <span className={label}>Device type</span>
            <select className={input} value={form.device_type} onChange={(e) => setForm({ ...form, device_type: e.target.value })}>
              {DEVICE_TYPE_LIST.map((t) => <option key={t}>{t}</option>)}
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
          <div>
            <span className={label}>Assigned to (user)</span>
            <input className={input} value={form.assigned_to || ''} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder="Employee using this device" />
          </div>
          <div>
            <span className={label}>Department</span>
            <input className={input} value={form.department || ''} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Accounts / Sales / Admin" />
          </div>
          <div>
            <span className={label}>Status</span>
            <select className={input} value={form.status || 'In Use'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {ASSET_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          {canDates && (
            <>
              <div>
                <span className={label}>Purchase date</span>
                <input type="date" className={input} value={form.purchase_date || ''} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
              </div>
              <div>
                <span className={label}>Warranty / AMC start</span>
                <input type="date" className={input} value={form.warranty_start || ''} onChange={(e) => setForm({ ...form, warranty_start: e.target.value })} />
              </div>
              <div>
                <span className={label}>Warranty / AMC end</span>
                <input type="date" className={input} value={form.warranty_till || ''} onChange={(e) => setForm({ ...form, warranty_till: e.target.value })} />
              </div>
              <div>
                <span className={label}>Next service due (PM)</span>
                <input type="date" className={input} value={form.next_service_due || ''} onChange={(e) => setForm({ ...form, next_service_due: e.target.value })} />
              </div>
              <div>
                <span className={label}>Vendor / supplier</span>
                <input className={input} value={form.vendor || ''} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
              </div>
              <div>
                <span className={label}>Invoice no. / Cost (₹)</span>
                <div className="flex gap-2">
                  <input className={input} value={form.invoice_no || ''} onChange={(e) => setForm({ ...form, invoice_no: e.target.value })} placeholder="Invoice" />
                  <input type="number" className={input} value={form.cost ?? ''} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="Cost" />
                </div>
              </div>
            </>
          )}
          <div className="md:col-span-3">
            <span className={label}>Notes</span>
            <textarea className={input} rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="md:col-span-3 flex gap-2">
            <button onClick={save} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>Save asset</button>
            <button onClick={() => setForm(null)} className={`${btn} bg-slate-200 hover:bg-slate-300`}>Cancel</button>
          </div>
        </div>
      )}

      <DataTable
        empty="No assets yet. Register every customer device — each gets a unique code and a printable QR label."
        columns={[
          { key: 'asset_code', label: 'Asset Code', width: '110px', render: (a) => <span className="font-mono font-semibold text-indigo-700">{a.asset_code}</span> },
          { key: 'company', label: 'Customer', render: (a) => customersById[a.customer_id]?.company || 'Unknown' },
          { key: 'device_type', label: 'Device Type', width: '160px' },
          { key: 'brand', label: 'Brand / Model', render: (a) => `${a.brand || ''} ${a.model || ''}`.trim() },
          { key: 'serial_number', label: 'Serial No.', width: '140px', render: (a) => <span className="font-mono text-xs">{a.serial_number}</span> },
          { key: 'assigned', label: 'Assigned To', width: '150px', render: (a) => a.assigned_to ? (<span>{a.assigned_to}{a.department && <span className="block text-xs text-slate-500">{a.department}</span>}</span>) : '' },
          { key: 'status', label: 'Status', width: '110px', render: (a) => <span className={chip(assetStatusTone[a.status] || 'bg-slate-100 text-slate-600')}>{a.status || 'In Use'}</span> },
          { key: 'warranty', label: 'Warranty / PM', width: '150px', render: (a) => {
            const w = warrantyState(a)
            return (
              <span className="text-xs">
                {w ? <span className={w.tone}>{w.label}</span> : <span className="text-slate-300">—</span>}
                {a.next_service_due && <span className="block text-slate-500">PM: {a.next_service_due}</span>}
              </span>
            )
          } },
          { key: 'location', label: 'Location', render: (a) => <span className="text-slate-600">{a.location}</span> },
          { key: 'act', label: 'Actions', width: '220px', render: (a) => (
            <span className="text-xs font-medium">
              <a href={`#/asset/${a.asset_code}`} className="text-emerald-700 hover:underline mr-2">Open</a>
              <button onClick={() => printLabel(a)} className="text-indigo-700 hover:underline mr-2">QR label</button>
              <button onClick={() => setForm({ ...a })} className="text-indigo-700 hover:underline mr-2">Edit</button>
              <button onClick={() => remove(a.id)} className="text-red-600 hover:underline">Delete</button>
            </span>
          ) },
        ]}
        rows={visible}
      />
    </div>
  )
}
