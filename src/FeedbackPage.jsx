import React, { useState } from 'react'
import { supabase } from './supabase'

const input = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const label = 'block text-sm font-medium text-slate-700 mb-2'

export default function FeedbackPage({ ticketId }) {
  const [resolved, setResolved] = useState('')
  const [outstanding, setOutstanding] = useState('No')
  const [outstandingText, setOutstandingText] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [rating, setRating] = useState(0)
  const [submittedBy, setSubmittedBy] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!resolved) return setError('Please tell us if your problem was resolved')
    setBusy(true)
    setError('')
    const { error: err } = await supabase.from('feedback').insert({
      ticket_id: ticketId,
      problem_resolved: resolved,
      outstanding_issues: outstanding === 'Yes' ? `Yes — ${outstandingText || 'details not given'}` : 'No',
      recommendations: recommendations || null,
      rating: rating || null,
      submitted_by: submittedBy || null,
    })
    setBusy(false)
    if (err) return setError('Could not submit — please try again. ' + err.message)
    setDone(true)
  }

  if (done)
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 text-center">
          <p className="text-3xl">🙏</p>
          <h1 className="text-xl font-semibold mt-2">Thank you!</h1>
          <p className="text-sm text-slate-500 mt-2">Your feedback has been recorded and helps us serve you better.</p>
          <p className="text-xs text-slate-400 mt-4">India Digital Corporation · EasyGo Solutions</p>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
        <h1 className="text-xl font-semibold">How did we do?</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">Service feedback — ticket #{String(ticketId).slice(0, 8)}</p>

        <div className="space-y-5">
          <div>
            <span className={label}>1. Is your problem resolved? *</span>
            <div className="flex gap-2">
              {['Yes', 'No', 'Partially'].map((o) => (
                <button key={o} onClick={() => setResolved(o)}
                  className={`flex-1 py-2 rounded-md text-sm border ${resolved === o ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 hover:bg-slate-50'}`}>
                  {o}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={label}>2. Any issues still outstanding?</span>
            <div className="flex gap-2 mb-2">
              {['No', 'Yes'].map((o) => (
                <button key={o} onClick={() => setOutstanding(o)}
                  className={`flex-1 py-2 rounded-md text-sm border ${outstanding === o ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 hover:bg-slate-50'}`}>
                  {o}
                </button>
              ))}
            </div>
            {outstanding === 'Yes' && (
              <textarea className={input} rows={2} placeholder="Please describe the pending issue…" value={outstandingText} onChange={(e) => setOutstandingText(e.target.value)} />
            )}
          </div>

          <div>
            <span className={label}>3. Any recommendations for us?</span>
            <textarea className={input} rows={2} placeholder="Optional" value={recommendations} onChange={(e) => setRecommendations(e.target.value)} />
          </div>

          <div>
            <span className={label}>4. Rate our service</span>
            <div className="flex gap-1 text-3xl">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className={n <= rating ? 'text-amber-400' : 'text-slate-300'}>★</button>
              ))}
            </div>
          </div>

          <input className={input} placeholder="Your name (optional)" value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} />

          {error && <p className="text-xs text-red-600">{error}</p>}
          <button onClick={submit} disabled={busy} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-md py-3 text-sm font-medium disabled:opacity-60">
            {busy ? 'Submitting…' : 'Submit feedback'}
          </button>
        </div>
      </div>
    </div>
  )
}
