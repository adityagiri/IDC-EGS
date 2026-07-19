import React, { useEffect, useState } from 'react'
import { supabase } from './supabase'
import AmcApp from './AmcApp'

export default function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        Loading…
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <form onSubmit={signIn} className="bg-white rounded-xl shadow-xl w-full max-w-sm p-8">
          <h1 className="text-xl font-semibold text-slate-900">AMC Command Center</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">India Digital Corporation · EasyGo Solutions</p>
          <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-md py-2 text-sm font-medium disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-xs text-slate-400 mt-4">
            Accounts are created by the administrator. Contact Santosh if you need access.
          </p>
        </form>
      </div>
    )
  }

  return <AmcApp session={session} onSignOut={() => supabase.auth.signOut()} />
}
