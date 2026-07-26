'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getAnonPlays } from '@/lib/localStorage'
import { populateLocalStorageFromDB, syncAnonPlaysToSupabase, registerPublicUser } from '@/lib/supabaseScores'

type Step = 'form' | 'loading' | 'sync-offer'

export default function AuthModal({
  onClose,
  onAuthComplete,
}: {
  onClose: () => void
  onAuthComplete: () => void
}) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [step, setStep] = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [anonCount, setAnonCount] = useState(0)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setStep('loading')
    try {
      let userId: string
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        userId = data.user!.id
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        userId = data.user.id
      }
      await populateLocalStorageFromDB(userId)
      await registerPublicUser()
      const anon = getAnonPlays()
      if (anon.length > 0) {
        setAnonCount(anon.length)
        setStep('sync-offer')
      } else {
        onAuthComplete()
        onClose()
      }
    } catch (err: unknown) {
      setStep('form')
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const handleSyncAccept = async () => {
    setStep('loading')
    await syncAnonPlaysToSupabase()
    onAuthComplete()
    onClose()
  }

  const handleSyncDecline = () => {
    onAuthComplete()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-6"
      onClick={step === 'form' ? onClose : undefined}
    >
      <div
        className="bg-white rounded-2xl p-7 w-full max-w-sm flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        {step === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-6 h-6 border-2 border-[#e8e8e8] border-t-[#1a1a1a] rounded-full animate-spin" />
            <p className="text-sm text-[#aaa]">Loading your account…</p>
          </div>
        )}

        {step === 'form' && (
          <>
            <div>
              <p className="text-xs text-[#bbb] uppercase tracking-widest mb-1">
                {mode === 'signin' ? 'Welcome back' : 'Create account'}
              </p>
              <h2 className="font-serif text-3xl text-[#1a1a1a]">
                {mode === 'signin' ? 'Sign in' : 'Sign up'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-[#e8e8e8] text-sm outline-none focus:border-[#bbb] transition-colors"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl border border-[#e8e8e8] text-sm outline-none focus:border-[#bbb] transition-colors"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                className="w-full py-3 rounded-full bg-[#1a1a1a] text-white text-sm font-medium hover:opacity-85 transition-opacity"
              >
                {mode === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            </form>
            <p className="text-xs text-center text-[#aaa]">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                className="text-[#555] underline"
                onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(null) }}
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </>
        )}

        {step === 'sync-offer' && (
          <>
            <div>
              <p className="text-xs text-[#bbb] uppercase tracking-widest mb-1">Transfer plays</p>
              <h2 className="font-serif text-3xl text-[#1a1a1a]">Save your history</h2>
            </div>
            <p className="text-sm text-[#555] leading-relaxed">
              You have <strong>{anonCount} puzzle{anonCount !== 1 ? 's' : ''}</strong> played on this device that are not on your account yet. Transfer them now?
            </p>
            <p className="text-xs text-[#aaa] leading-relaxed">
              This permanently moves them from this device to your account — accessible on any device you sign in to, but no longer stored locally here.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSyncAccept}
                className="w-full py-3 rounded-full bg-[#1a1a1a] text-white text-sm font-medium hover:opacity-85 transition-opacity"
              >
                Transfer {anonCount} puzzle{anonCount !== 1 ? 's' : ''} to my account
              </button>
              <button
                onClick={handleSyncDecline}
                className="w-full py-3 text-sm font-medium text-[#aaa] hover:text-[#555] transition-colors"
              >
                No thanks, keep them on this device
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
