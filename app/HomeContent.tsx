'use client'

import { useState, useEffect, useRef } from 'react'
import posthog from 'posthog-js'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getTodaysCT, dayBefore } from '@/lib/dates'
import { hasPlayed, computeStreak, getLongestStreak, getBestTimeEntry, getBestScoreEntry, getLowestScoreEntry, getVerbaBestWord, migrateToAnonNamespace, clearAccountLocalStorage, clearCurrentUser } from '@/lib/localStorage'
import { fmtTime } from '@/lib/format'
import AuthModal from '@/components/AuthModal'
import FeedbackModal from '@/components/FeedbackModal'

const GAMES = [
  { href: '/numeris', name: 'Numeris', desc: 'Equation Puzzle', key: 'numeris' },
  { href: '/lumis', name: 'Lumis', desc: 'Memory Tiles', key: 'lumis' },
  { href: '/verba', name: 'Verba', desc: 'Word Drop', key: 'verba' },
  { href: '/aquarum', name: 'Aquarum', desc: 'Pipe Flow', key: 'aquarum' },
  { href: '/compondus', name: 'Compondus', desc: 'Word Chain', key: 'compondus' },
  { href: '/loopa', name: 'Loopa', desc: 'Close the Loop', key: 'loopa' },
] as const

const TUTORIAL_CONTENT: Record<string, { title: string; body: string }> = {
  numeris: {
    title: 'How to play Numeris',
    body: 'Arrange the number and operator tiles into the slots to form a math equation that equals the target number. Drag tiles from the tray into the slots, or tap a tile to place it in the next empty slot. Tap a filled slot to return it to the tray, or drag slots into each other to swap them. You must use all tiles.',
  },
  lumis: {
    title: 'How to play Lumis',
    body: 'A pattern of lit cells appears on the grid — memorize it. Pick up your first piece to start the timer and turn the lights off, then place all pieces to recreate the pattern from memory. Drag pieces onto the grid, or tap a piece then tap a cell to place it. Hit Reset any time to see the pattern again.',
  },
  verba: {
    title: 'How to play Verba',
    body: 'Place letter tiles onto the grid to form words across rows and columns. Letters fall to the bottom of the column when placed. Words are detected automatically — longer words and rarer letters score more points. You have 60 seconds to arrange your tiles and maximize your score.',
  },
  aquarum: {
    title: 'How to play Aquarum',
    body: 'Rotate the gray pipe segments to connect each colored inlet to its matching colored outlet. Colored pipes are already locked in the correct position — only the gray ones need rotating. Tap a gray pipe to rotate it 90°. All paths must be connected to solve the puzzle.',
  },
  compondus: {
    title: 'How to play Compondus',
    body: "You are shown the first and last word of a chain. Fill in the missing links so each adjacent pair forms a compound word or common phrase. The first letter of each hidden word is shown as a hint. Wrong guesses reveal the next letter and add to your score — aim for zero.",
  },
  loopa: {
    title: 'How to play Loopa',
    body: "Draw a single closed loop through the dots of the grid. Click any line segment between dots to toggle it on or off. Numbers inside squares tell you exactly how many of that square's sides the loop must use. The loop must connect back to itself with no branches or dead ends.",
  },
}

function TutorialModal({ game, onClose }: { game: string; onClose: () => void }) {
  const content = TUTORIAL_CONTENT[game]
  if (!content) return null
  return (
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-7 w-full max-w-lg flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-serif text-2xl text-[#1a1a1a]">{content.title}</h2>
        <p className="text-sm text-[#555] leading-relaxed">{content.body}</p>
        <video
          src={`/${game}-tutorial.mov`}
          autoPlay
          loop
          muted
          playsInline
          className="w-full rounded-xl"
        />
        <button
          className="w-full py-3 rounded-full bg-[#1a1a1a] text-white text-sm font-medium hover:opacity-85 transition-opacity"
          onClick={onClose}
        >
          Got it!
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-[#f8f8f8] rounded-2xl py-4 px-3">
      <span className="text-2xl font-serif text-[#1a1a1a]">{value}</span>
      <span className="text-[11px] text-[#aaa] uppercase tracking-wide text-center">{label}</span>
    </div>
  )
}

function StatRow({ label, value, href }: { label: string; value: string | number | null; href?: string }) {
  if (value == null) return null
  if (href) {
    return (
      <Link href={href} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#f8f8f8] hover:bg-[#f0f0f0] transition-colors group mb-2 last:mb-0">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-[#aaa] uppercase tracking-wide">{label}</span>
          <span className="text-sm font-medium text-[#1a1a1a]">{value}</span>
        </div>
        <span className="text-[#ccc] group-hover:text-[#999] transition-colors text-sm">→</span>
      </Link>
    )
  }
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-[#f5f5f5] last:border-0">
      <span className="text-sm text-[#888]">{label}</span>
      <span className="text-sm font-medium text-[#1a1a1a]">{value}</span>
    </div>
  )
}

function StatsModal({ game, gameName, today, onClose }: { game: string; gameName: string; today: string; onClose: () => void }) {
  const currentStreak = Math.max(computeStreak(game, today), computeStreak(game, dayBefore(today)))
  const longestStreak = getLongestStreak(game)
  const bestTimeEntry = getBestTimeEntry(game)
  const bestScoreEntry = getBestScoreEntry(game)
  const fewestWrongEntry = game === 'compondus' ? getLowestScoreEntry(game) : null
  const verbaBestWord = game === 'verba' ? getVerbaBestWord() : null

  const puzzleHref = (date: string) =>
    date === today ? `/${game}` : `/archive/${game}/${date}`

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        <div className="px-7 pt-7 pb-5">
          <p className="text-xs text-[#bbb] uppercase tracking-widest mb-1">Stats</p>
          <h2 className="font-serif text-3xl text-[#1a1a1a]">{gameName}</h2>
        </div>

        {currentStreak === 0 && longestStreak === 0 && bestTimeEntry == null && bestScoreEntry == null && fewestWrongEntry == null ? (
          <div className="px-7 pb-7">
            <p className="text-sm text-[#bbb]">No plays yet — come back after your first game!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 px-7 pb-5">
              <StatCard label="Streak" value={currentStreak > 0 ? `${currentStreak}🔥` : currentStreak} />
              <StatCard label="Best streak" value={longestStreak} />
            </div>

            <div className="px-7 pb-2">
              {game !== 'compondus' && game !== 'verba' && bestTimeEntry && <StatRow label="Best time" value={fmtTime(bestTimeEntry.value)} href={puzzleHref(bestTimeEntry.date)} />}
              {game === 'verba' && bestScoreEntry && <StatRow label="Best score" value={`${bestScoreEntry.value} pts`} href={puzzleHref(bestScoreEntry.date)} />}
              {game === 'compondus' && fewestWrongEntry && <StatRow label="Fewest wrong guesses" value={fewestWrongEntry.value} href={puzzleHref(fewestWrongEntry.date)} />}
              {game === 'verba' && verbaBestWord && <StatRow label="Best word" value={`${verbaBestWord.word} · ${verbaBestWord.score} pts`} href={puzzleHref(verbaBestWord.date)} />}
            </div>
          </>
        )}

        <div className="px-7 pb-7 pt-3">
          <button
            className="w-full py-3 rounded-full bg-[#1a1a1a] text-white text-sm font-medium hover:opacity-85 transition-opacity"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function readGameState(d: string) {
  const st: Record<string, 'done' | 'inprog' | 'play'> = {}
  const s: Record<string, number> = {}
  for (const g of GAMES) {
    if (hasPlayed(g.key, d)) st[g.key] = 'done'
    else if (localStorage.getItem(`${g.key}-inprog-${d}`)) st[g.key] = 'inprog'
    else st[g.key] = 'play'
    s[g.key] = Math.max(computeStreak(g.key, d), computeStreak(g.key, dayBefore(d)))
  }
  return { statuses: st, streaks: s }
}

export default function HomeContent() {
  const [today] = useState(() => {
    migrateToAnonNamespace()
    return getTodaysCT()
  })
  const [{ statuses, streaks }, setGameState] = useState(() => readGameState(getTodaysCT()))

  const refreshGameState = () => setGameState(readGameState(today))

  const [user, setUser] = useState<User | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!showUserMenu) return
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showUserMenu])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    clearAccountLocalStorage()
    clearCurrentUser()
    setShowUserMenu(false)
    refreshGameState()
  }

  const [tutorialGame, setTutorialGame] = useState<string | null>(null)
  const [statsGame, setStatsGame] = useState<string | null>(null)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  return (
    <main className="min-h-screen flex flex-col items-center p-6 pb-16">
      <div className="w-full max-w-sm md:max-w-2xl flex flex-col items-center gap-8 mt-8">
        <div className="relative w-full flex flex-col items-center gap-1">
          <div className="absolute right-0 top-0" ref={userMenuRef}>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  className="text-xs text-[#888] border border-[#e8e8e8] rounded-full px-3 py-1.5 hover:border-[#bbb] hover:text-[#555] transition-colors block max-w-32 truncate"
                >
                  {user.email}
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-[#e8e8e8] rounded-xl shadow-sm py-1 min-w-25 z-10">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-xs text-[#888] hover:text-[#1a1a1a] hover:bg-[#f8f8f8] transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-xs text-[#888] border border-[#e8e8e8] rounded-full px-3 py-1.5 hover:border-[#bbb] hover:text-[#555] transition-colors"
              >
                Sign in
              </button>
            )}
          </div>
          <h1 className="font-serif text-5xl text-center">Compound Games</h1>
          <p className="text-sm text-[#aaa] text-center pt-1">
            six daily puzzles · resets at midnight CT
          </p>
          {today && (
            <p className="text-[0.65rem] text-[#c5bcbc] uppercase tracking-widest mt-1">
              {new Date(today + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
          {GAMES.map(g => {
            const status = statuses[g.key] ?? 'play'
            const streak = streaks[g.key] ?? 0
            return (
              <div
                key={g.key}
                className="relative flex items-start gap-3 px-6 py-6 border border-[#f0f0f0] rounded-2xl hover:border-[#ddd] transition-colors bg-white"
              >
                <Link href={g.href} className="absolute inset-0 rounded-2xl" aria-label={g.name} />
                <div className="flex-1 select-none">
                  <div className="font-serif text-2xl">{g.name}</div>
                  <div className="text-sm text-[#aaa]">{g.desc}</div>
                </div>
                <div className="flex flex-col items-end gap-2 select-none">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setStatsGame(g.key); posthog.capture('stats_viewed', { game: g.key }) }}
                      className="relative z-10 w-7 h-7 shrink-0 rounded-full border border-[#e8e8e8] text-[#ccc] text-xs hover:border-[#bbb] hover:text-[#555] transition-colors flex items-center justify-center"
                      aria-label={`${g.name} stats`}
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
                        <rect x="0" y="5" width="3" height="6" rx="0.5"/>
                        <rect x="4" y="2" width="3" height="9" rx="0.5"/>
                        <rect x="8" y="0" width="3" height="11" rx="0.5"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => { setTutorialGame(g.key); posthog.capture('tutorial_viewed', { game: g.key }) }}
                      className="relative z-10 w-7 h-7 shrink-0 rounded-full border border-[#e8e8e8] text-[#ccc] text-xs hover:border-[#bbb] hover:text-[#555] transition-colors flex items-center justify-center"
                      aria-label={`How to play ${g.name}`}
                    >
                      ?
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {streak > 0 && (
                      <span className="text-xs text-[#f59e0b] font-medium">{streak}🔥</span>
                    )}
                    {status === 'done' && (
                      <span className="text-xs font-medium text-[#059669] bg-[#d1fae5] px-2 py-0.5 rounded-full">✓ Done</span>
                    )}
                    {status === 'inprog' && (
                      <span className="text-xs font-medium text-[#d97706] bg-[#fef3c7] px-2 py-0.5 rounded-full">Continue</span>
                    )}
                    {status === 'play' && (
                      <span className="text-xs font-medium text-[#aaa] bg-[#f5f5f5] px-2 py-0.5 rounded-full">Play</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <Link
          href="/archive"
          className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-white hover:bg-[#fafafa] transition-colors border border-[#f0f0f0] hover:border-[#ddd]"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-[#1a1a1a]">Browse past puzzles</span>
            <span className="text-xs text-[#aaa]">Play any archived puzzle</span>
          </div>
          <span className="text-[#bbb] text-sm">→</span>
        </Link>

        <div className="flex items-center gap-2">
          <a
            href="https://buymeacoffee.com/compoundgames"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => posthog.capture('support_clicked')}
            className="text-[0.65rem] text-[#999] hover:text-[#555] transition-colors uppercase tracking-widest"
          >
            Support the Site
          </a>
          <span className="text-[0.65rem] text-[#bbb]">·</span>
          <button
            onClick={() => setShowFeedback(true)}
            className="text-[0.65rem] text-[#999] hover:text-[#555] transition-colors uppercase tracking-widest"
          >
            Feedback Form
          </button>
          <span className="text-[0.65rem] text-[#bbb]">·</span>
          <button
            onClick={() => setShowPrivacy(true)}
            className="text-[0.65rem] text-[#999] hover:text-[#555] transition-colors uppercase tracking-widest"
          >
            Privacy Policy
          </button>
        </div>

      </div>

      {tutorialGame && (
        <TutorialModal game={tutorialGame} onClose={() => setTutorialGame(null)} />
      )}
      {statsGame && (
        <StatsModal
          game={statsGame}
          gameName={GAMES.find(g => g.key === statsGame)?.name ?? statsGame}
          today={today}
          onClose={() => setStatsGame(null)}
        />
      )}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onAuthComplete={refreshGameState}
        />
      )}
      {showFeedback && (
        <FeedbackModal onClose={() => setShowFeedback(false)} />
      )}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-6" onClick={() => setShowPrivacy(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm flex flex-col overflow-hidden max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-4 border-b border-[#f5f5f5]">
              <p className="text-xs text-[#bbb] uppercase tracking-widest mb-1">Legal</p>
              <h2 className="font-serif text-3xl text-[#1a1a1a]">Privacy</h2>
            </div>
            <div className="px-7 py-5 overflow-y-auto flex flex-col gap-4 text-sm text-[#555] leading-snug">
              <div>
                <p className="font-medium text-[#1a1a1a] mb-1">Your device</p>
                <p>Progress and scores are saved in your browser&apos;s local storage, private to your device. Data never leaves it unless you create an account and choose to transfer it.</p>
              </div>
              <div>
                <p className="font-medium text-[#1a1a1a] mb-1">Analytics</p>
                <p>We use PostHog to understand how people play. It collects anonymous usage data (puzzle completions, page views). A random session ID is stored in your browser, not linked to you. No personal data is collected or sold.</p>
              </div>
              <div>
                <p className="font-medium text-[#1a1a1a] mb-1">Accounts (optional)</p>
                <p>If you create an account, your email and scores are stored securely (Supabase). Email is used only for sign-in, no marketing, no sharing. Request deletion anytime via the feedback form.</p>
              </div>
            </div>
            <div className="px-7 pb-7 pt-2">
              <button
                className="w-full py-3 rounded-full bg-[#1a1a1a] text-white text-sm font-medium hover:opacity-85 transition-opacity"
                onClick={() => setShowPrivacy(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
