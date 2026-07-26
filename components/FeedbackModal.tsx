'use client'

import { useState } from 'react'

const CATEGORIES = ['General', 'Bug / Issue', 'Game Idea', 'Feature Request'] as const

const MAX = 500

export default function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<string>('General')
  const [from, setFrom] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/send-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, category, from: from.trim() || 'Anonymous' }),
      })
      if (!res.ok) throw new Error('Failed')
      setDone(true)
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-6"
      onClick={!done && !submitting ? onClose : undefined}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {done ? (
          <div className="px-7 py-10 flex flex-col items-center gap-4 text-center">
            <span className="text-4xl">✉️</span>
            <h2 className="font-serif text-3xl text-[#1a1a1a]">Thanks!</h2>
            <p className="text-sm text-[#aaa]">Your message was received.</p>
            <button
              onClick={onClose}
              className="mt-2 w-full py-3 rounded-full bg-[#1a1a1a] text-white text-sm font-medium hover:opacity-85 transition-opacity"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="px-7 pt-7 pb-4 border-b border-[#f5f5f5]">
              <p className="text-xs text-[#bbb] uppercase tracking-widest mb-1">Ideas &amp; bugs</p>
              <h2 className="font-serif text-3xl text-[#1a1a1a]">Leave feedback</h2>
            </div>
            <form onSubmit={handleSubmit} className="px-7 py-5 flex flex-col gap-4">
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      category === c
                        ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                        : 'text-[#555] border-[#ddd] hover:border-[#aaa]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={from}
                onChange={e => setFrom(e.target.value)}
                placeholder="Name or email (optional)"
                maxLength={100}
                className="w-full px-4 py-3 border border-[#e0e0e0] rounded-2xl text-sm outline-none focus:border-[#aaa] transition-colors"
              />
              <div className="flex flex-col gap-1">
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value.slice(0, MAX))}
                  placeholder="What's on your mind?"
                  required
                  rows={5}
                  className="w-full px-4 py-3 border border-[#e0e0e0] rounded-2xl text-sm outline-none focus:border-[#aaa] transition-colors resize-none"
                />
                <p className="text-xs text-right text-[#ccc]">{message.length}/{MAX}</p>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="w-full py-3 rounded-full bg-[#1a1a1a] text-white text-sm font-medium hover:opacity-85 transition-opacity disabled:opacity-40"
              >
                {submitting ? 'Sending…' : 'Send feedback'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
