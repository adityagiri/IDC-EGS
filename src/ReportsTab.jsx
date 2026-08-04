import React, { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { DataTable } from './ui'

const btn = 'px-4 py-2 rounded-md text-sm font-medium'
const fmtDT = (ts) => (ts ? new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const download = (sheets, filename) => {
  const wb = XLSX.utils.book_new()
  sheets.forEach(([name, rows]) => {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ note: 'No data' }]), name.slice(0, 31))
  })
  XLSX.writeFile(wb, filename)
}

export default function ReportsTab({ customers, contracts, assets, tickets, reports, attendance, expenses, feedback, flash }) {
  const [month, setMonth] = useState('All')

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

  const months = useMemo(() => {
    const all = [
      ...tickets.map((t) => String(t.created_at || '').slice(0, 7)),
      ...expenses.map((e) => String(e.date || '').slice(0, 7)),
      ...reports.map((r) => String(r.date || '').slice(0, 7)),
    ].filter(Boolean)
    return [...new Set(all)].sort().reverse()
  }, [tickets, expenses, reports])

  const inMonth = (dateStr) => month === 'All' || String(dateStr || '').startsWith(month)

  // ---------- Report 1: Engineer performance ----------
  const engineerPerf = useMemo(() => {
    const map = {}
    const get = (name) => {
      if (!name) name = 'Unassigned'
      if (!map[name]) map[name] = { Engineer: name, 'Tickets handled': 0, 'Tickets resolved': 0, 'Repeat calls (marked)': 0, 'Repeat calls (auto)': 0, 'Service reports': 0, 'Site visits': 0, 'Minutes on site': 0 }
      return map[name]
    }
    const filteredTickets = tickets.filter((t) => inMonth(t.created_at))
    filteredTickets.forEach((t) => {
      const row = get(t.assigned_to)
      row['Tickets handled']++
      if (t.status === 'Resolved' || t.status === 'Closed') row['Tickets resolved']++
      if (t.repeat_call) row['Repeat calls (marked)']++
    })
    // repeat call: another ticket on the same asset within 30 days before this one
    filteredTickets.forEach((t) => {
      if (!t.asset_id) return
      const earlier = tickets.find(
        (o) => o.id !== t.id && o.asset_id === t.asset_id && new Date(t.created_at) - new Date(o.created_at) > 0 && new Date(t.created_at) - new Date(o.created_at) < 30 * 86400000
      )
      if (earlier) get(t.assigned_to)['Repeat calls (auto)']++
    })
    reports.filter((r) => inMonth(r.date)).forEach((r) => get(r.engineer)['Service reports']++)
    attendance.filter((a) => inMonth(a.check_in)).forEach((a) => {
      const row = get(a.engineer)
      row['Site visits']++
      if (a.check_out) row['Minutes on site'] += Math.round((new Date(a.check_out) - new Date(a.check_in)) / 60000)
    })
    return Object.values(map)
  }, [tickets, reports, attendance, month])

  // Detailed ticket register with full date-time audit trail
  const ticketRows = useMemo(
    () =>
      tickets
        .filter((t) => inMonth(t.created_at))
        .map((t) => ({
          'Raised (date-time)': fmtDT(t.created_at),
          Company: customersById[t.customer_id]?.company || 'Unknown',
          Asset: t.asset_id ? assetsById[t.asset_id]?.asset_code || '' : '',
          Issue: t.title,
          Details: t.description || '',
          Priority: t.priority,
          Status: t.status,
          'Raised by': t.created_by || '',
          'Assigned engineer': t.assigned_to || '',
          'Resolved by': t.resolved_by || '',
          'Resolved (date-time)': fmtDT(t.resolved_at),
          'Repeat call': t.repeat_call ? 'YES' : '',
          'Repeat marked by': t.repeat_marked_by || '',
        })),
    [tickets, customersById, assetsById, month]
  )

  // ---------- Report 2: Company-wise tickets ----------
  const companyTickets = useMemo(() => {
    const map = {}
    tickets.filter((t) => inMonth(t.created_at)).forEach((t) => {
      const name = customersById[t.customer_id]?.company || 'Unknown'
      if (!map[name]) map[name] = { Company: name, Raised: 0, Resolved: 0, Pending: 0 }
      map[name].Raised++
      if (t.status === 'Resolved' || t.status === 'Closed') map[name].Resolved++
      else map[name].Pending++
    })
    return Object.values(map)
  }, [tickets, customersById, month])

  // ---------- Report 3: Expenses ----------
  const expenseRows = useMemo(
    () =>
      expenses
        .filter((e) => inMonth(e.date))
        .map((e) => ({
          Date: e.date,
          Engineer: e.engineer,
          Company: e.customer_id ? customersById[e.customer_id]?.company || '' : '',
          From: e.from_location || '',
          To: e.to_location || '',
          Mode: e.travel_mode || '',
          Amount: Number(e.amount || 0),
          Status: e.status,
          'Approved by': e.approved_by || '',
          Notes: e.notes || '',
        })),
    [expenses, customersById, month]
  )
  const expenseByEngineer = useMemo(() => {
    const map = {}
    expenseRows.forEach((r) => {
      if (!map[r.Engineer]) map[r.Engineer] = { Engineer: r.Engineer, 'Total claimed': 0, 'Approved+Paid': 0, Pending: 0 }
      map[r.Engineer]['Total claimed'] += r.Amount
      if (r.Status === 'Approved' || r.Status === 'Paid') map[r.Engineer]['Approved+Paid'] += r.Amount
      if (r.Status === 'Pending') map[r.Engineer]['Pending'] += r.Amount
    })
    return Object.values(map)
  }, [expenseRows])
  const expenseTotal = expenseRows.reduce((s, r) => s + r.Amount, 0)

  // ---------- Report 4: AMC / renewal ----------
  const amcRows = useMemo(
    () =>
      contracts.map((c) => {
        const d = c.end_date ? Math.ceil((new Date(c.end_date + 'T23:59:59') - new Date()) / 86400000) : null
        return {
          Company: customersById[c.customer_id]?.company || 'Unknown',
          Venture: customersById[c.customer_id]?.venture || '',
          Tier: c.tier,
          'Value/cycle': Number(c.value || 0),
          Billing: c.billing,
          Start: c.start_date || '',
          End: c.end_date || '',
          'Days left': d,
          Status: d === null ? '-' : d < 0 ? 'EXPIRED' : d <= 30 ? 'RENEW NOW' : d <= 60 ? 'Start renewal' : 'Active',
        }
      }),
    [contracts, customersById]
  )

  // ---------- Service reports register (who scanned & serviced what, when) ----------
  const serviceRows = useMemo(
    () =>
      reports
        .filter((r) => inMonth(r.date))
        .map((r) => {
          const done = r.checklist ? Object.values(r.checklist).filter(Boolean).length : 0
          const total = r.checklist ? Object.keys(r.checklist).length : 0
          return {
            id: r.id,
            'Date-time (submitted)': fmtDT(r.created_at),
            Asset: assetsById[r.asset_id]?.asset_code || '—',
            Device: assetsById[r.asset_id]?.device_type || '',
            Company: customersById[r.customer_id]?.company || 'Unknown',
            'Engineer (done by)': r.engineer,
            Result: r.result || '',
            Issue: r.issue_category || '',
            'Checks done': `${done}/${total}`,
            'Activities performed': r.checklist ? Object.entries(r.checklist).filter(([, v]) => v).map(([k]) => k).join('; ') : '',
            Parts: r.parts_replaced || '',
            Remarks: r.remarks || '',
          }
        }),
    [reports, assetsById, customersById, month]
  )

  // ---------- Report: Full export ----------
  const exportEverything = () => {
    download(
      [
        ['Customers', customers.map((c) => ({ Company: c.company, Venture: c.venture, Segment: c.segment, Contact: c.contact, Phone: c.phone, Email: c.email, Notes: c.notes }))],
        ['Contracts', amcRows],
        ['Assets', assets.map((a) => ({ Code: a.asset_code, Company: customersById[a.customer_id]?.company || '', Type: a.device_type, Brand: a.brand, Model: a.model, Serial: a.serial_number, Location: a.location }))],
        ['Tickets', ticketRows],
        ['Service Reports', serviceRows.map(({ id, ...rest }) => rest)],
        ['Attendance', attendance.map((a) => ({ Engineer: a.engineer, Company: a.customer_id ? customersById[a.customer_id]?.company : '', 'Check in (date-time)': fmtDT(a.check_in), 'Check out (date-time)': fmtDT(a.check_out), 'Minutes on site': a.check_out ? Math.round((new Date(a.check_out) - new Date(a.check_in)) / 60000) : '', 'In GPS': a.in_lat ? `${a.in_lat},${a.in_lng}` : '', 'Out GPS': a.out_lat ? `${a.out_lat},${a.out_lng}` : '' }))],
        ['Expenses', expenses.map((e) => ({ Date: e.date, Engineer: e.engineer, Amount: Number(e.amount || 0), Mode: e.travel_mode, From: e.from_location, To: e.to_location, Status: e.status, 'Approved by': e.approved_by || '' }))],
        ['Feedback', feedback.map((f) => ({ Ticket: f.ticket_id, Resolved: f.problem_resolved, 'Outstanding issues': f.outstanding_issues, Recommendations: f.recommendations, Rating: f.rating, Date: String(f.created_at || '').slice(0, 10) }))],
      ],
      `full-backup-${new Date().toISOString().slice(0, 10)}.xlsx`
    )
    flash('Full backup exported')
  }

  const card = 'bg-white rounded-lg border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium">Reports & Excel exports</h2>
        <select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="All">All time</option>
          {months.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className={card}>
        <div>
          <p className="text-sm font-medium">1 · Engineer performance</p>
          <p className="text-xs text-slate-500">Tickets handled/resolved, repeat calls (same asset within 30 days), service reports, site visits, minutes on site.</p>
        </div>
        <button className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`} onClick={() => download([['Engineer Performance', engineerPerf]], `engineer-performance-${month}.xlsx`)}>
          Export Excel
        </button>
      </div>

      <div className={card}>
        <div>
          <p className="text-sm font-medium">2 · Company-wise tickets</p>
          <p className="text-xs text-slate-500">Raised / resolved / pending per customer{month !== 'All' ? ` for ${month}` : ''}.</p>
        </div>
        <button className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`} onClick={() => download([['Company Summary', companyTickets], ['Ticket Register (detailed)', ticketRows]], `company-tickets-${month}.xlsx`)}>
          Export Excel
        </button>
      </div>

      <div className={card}>
        <div>
          <p className="text-sm font-medium">3 · Expense report — {inr(expenseTotal)} total</p>
          <p className="text-xs text-slate-500">Detailed entries + engineer-wise summary sheet. Filter by month above for monthly claims.</p>
        </div>
        <button className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`} onClick={() => download([['Expense Details', expenseRows], ['By Engineer', expenseByEngineer]], `expenses-${month}.xlsx`)}>
          Export Excel
        </button>
      </div>

      <div className={card}>
        <div>
          <p className="text-sm font-medium">4 · AMC contracts & renewals</p>
          <p className="text-xs text-slate-500">Every contract with days-left and renewal status — your renewal working file.</p>
        </div>
        <button className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`} onClick={() => download([['AMC Renewals', amcRows]], `amc-renewals.xlsx`)}>
          Export Excel
        </button>
      </div>

      <div className={card}>
        <div>
          <p className="text-sm font-medium">5 · Service reports register (QR scans)</p>
          <p className="text-xs text-slate-500">Every checklist submitted after scanning an asset — date-time, done by whom, activities performed. {serviceRows.length} in view.</p>
        </div>
        <button className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`} onClick={() => download([['Service Reports', serviceRows.map(({ id, ...r }) => r)]], `service-reports-${month}.xlsx`)}>
          Export Excel
        </button>
      </div>

      <DataTable
        empty="No service reports yet. They appear the moment an engineer scans an asset QR and submits the checklist."
        columns={[
          { key: 'Date-time (submitted)', label: 'Date & Time', width: '150px' },
          { key: 'Asset', label: 'Asset', width: '100px', render: (r) => <span className="font-mono text-xs font-semibold text-indigo-700">{r['Asset']}</span> },
          { key: 'Company', label: 'Customer' },
          { key: 'Engineer (done by)', label: 'Done By', width: '170px', render: (r) => <span className="text-xs">{r['Engineer (done by)']}</span> },
          { key: 'Result', label: 'Result', width: '140px' },
          { key: 'Checks done', label: 'Checks', width: '70px', align: 'center' },
          { key: 'Activities performed', label: 'Activities Performed', render: (r) => <span className="text-xs text-slate-600">{r['Activities performed']}</span> },
        ]}
        rows={serviceRows}
      />

      <div className={card + ' border-emerald-300 bg-emerald-50'}>
        <div>
          <p className="text-sm font-medium">6 · FULL BACKUP — everything, one file</p>
          <p className="text-xs text-slate-600">All 8 tables as separate sheets: customers, contracts, assets, tickets, service reports, attendance, expenses, feedback. Run this weekly and keep it on your NAS.</p>
        </div>
        <button className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`} onClick={exportEverything}>
          Export ALL data
        </button>
      </div>

      {/* Customer feedback list */}
      <div className="bg-white rounded-lg border border-slate-200">
        <p className="px-4 py-3 border-b border-slate-200 font-medium text-sm">Customer feedback received ({feedback.length})</p>
        {feedback.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">When a ticket is resolved, the customer gets a feedback email automatically. Responses appear here.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {feedback.map((f) => (
              <li key={f.id} className="px-4 py-3 text-sm">
                <p className="font-medium">
                  {'★'.repeat(f.rating || 0)}{'☆'.repeat(5 - (f.rating || 0))} — Problem resolved: {f.problem_resolved || '—'} · Outstanding issues: {f.outstanding_issues || 'None'}
                </p>
                {f.recommendations && <p className="text-xs text-slate-500 mt-1">Recommendation: {f.recommendations}</p>}
                <p className="text-xs text-slate-400 mt-0.5">{String(f.created_at || '').slice(0, 10)}{f.submitted_by ? ` · ${f.submitted_by}` : ''}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
