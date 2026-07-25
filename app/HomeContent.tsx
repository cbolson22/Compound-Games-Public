'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getTodaysCT, dayBefore } from '@/lib/dates'
import { hasPlayed, computeStreak, getLongestStreak, getBestTimeEntry, getBestScoreEntry, getVerbaBestWord } from '@/lib/localStorage'
import { fmtTime } from '@/lib/format'

const GAMES = [
  { href: '/numeris', name: 'Numeris', desc: 'Daily Number Puzzle', key: 'numeris' },
  { href: '/lumis', name: 'Lumis', desc: 'Daily Memory Puzzle', key: 'lumis' },
  { href: '/verba', name: 'Verba', desc: 'Daily Word Game', key: 'verba' },
  { href: '/aquarum', name: 'Aquarum', desc: 'Daily Pipe Puzzle', key: 'aquarum' },
  { href: '/compondus', name: 'Compondus', desc: 'Daily Word Chain', key: 'compondus' },
  { href: '/loopa', name: 'Loopa', desc: 'Daily Loop Puzzle', key: 'loopa' },
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

        {currentStreak === 0 && longestStreak === 0 && bestTimeEntry == null && bestScoreEntry == null ? (
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
              {game !== 'compondus' && bestTimeEntry && <StatRow label="Best time" value={fmtTime(bestTimeEntry.value)} href={puzzleHref(bestTimeEntry.date)} />}
              {game === 'verba' && bestScoreEntry && <StatRow label="Best score" value={`${bestScoreEntry.value} pts`} href={puzzleHref(bestScoreEntry.date)} />}
              {game === 'compondus' && bestScoreEntry && <StatRow label="Fewest wrong guesses" value={bestScoreEntry.value} href={puzzleHref(bestScoreEntry.date)} />}
              {game === 'verba' && verbaBestWord && <StatRow label="Best word" value={`${verbaBestWord.word} · ${verbaBestWord.score} pts`} />}
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

export default function HomeContent() {
  // ssr: false guarantees window/localStorage are available here — no useEffect needed
  const [{ today, statuses, streaks }] = useState(() => {
    const d = getTodaysCT()
    const st: Record<string, 'done' | 'inprog' | 'play'> = {}
    const s: Record<string, number> = {}
    for (const g of GAMES) {
      if (hasPlayed(g.key, d)) st[g.key] = 'done'
      else if (localStorage.getItem(`${g.key}-inprog-${d}`)) st[g.key] = 'inprog'
      else st[g.key] = 'play'
      s[g.key] = Math.max(computeStreak(g.key, d), computeStreak(g.key, dayBefore(d)))
    }
    return { today: d, statuses: st, streaks: s }
  })

  const [tutorialGame, setTutorialGame] = useState<string | null>(null)
  const [statsGame, setStatsGame] = useState<string | null>(null)

  return (
    <main className="min-h-screen flex flex-col items-center p-6 pb-16">
      <div className="w-full max-w-sm md:max-w-2xl flex flex-col items-center gap-8 mt-8">
        <div className="flex flex-col items-center gap-1">
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
                      onClick={() => setStatsGame(g.key)}
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
                      onClick={() => setTutorialGame(g.key)}
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

        <div className="w-full flex flex-col gap-3">
          <Link
            href="/archive"
            className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-[#eef4fb] hover:bg-[#e4edf7] transition-colors border border-[#cfe0f5]"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-[#1a1a1a]">🧩 Browse past puzzles</span>
              <span className="text-xs text-[#6a90b8]">Play any archived puzzle</span>
            </div>
            <span className="text-[#6a90b8] text-sm">→</span>
          </Link>
          <a
            href="https://buymeacoffee.com/compoundgames"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-[#f0faf4] hover:bg-[#e6f5ec] transition-colors border border-[#c3e6d0]"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-[#1a1a1a]">☕ Support this project</span>
              <span className="text-xs text-[#5a9e72]">Any support is appreciated!</span>
            </div>
            <span className="text-[#5a9e72] text-sm">→</span>
          </a>
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
    </main>
  )
}
