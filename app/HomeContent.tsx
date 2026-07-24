'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getTodaysCT } from '@/lib/dates'
import { hasPlayed, computeStreak } from '@/lib/localStorage'

const GAMES = [
  { href: '/numeris', name: 'Numeris', desc: 'Daily Number Puzzle', key: 'numeris' },
  { href: '/lumis', name: 'Lumis', desc: 'Daily Memory Puzzle', key: 'lumis' },
  { href: '/verba', name: 'Verba', desc: 'Daily Word Game', key: 'verba' },
  { href: '/aquarum', name: 'Aquarum', desc: 'Daily Pipe Puzzle', key: 'aquarum' },
  { href: '/compondus', name: 'Compondus', desc: 'Compound Word Chain', key: 'compondus' },
  { href: '/loopa', name: 'Loopa', desc: 'Draw a Closed Loop', key: 'loopa' },
] as const

const TUTORIAL_CONTENT: Record<string, { title: string; body: string }> = {
  numeris: {
    title: 'How to play Numeris',
    body: 'Arrange the number and operator tiles into the slots to form a math equation that equals the target number. Drag tiles from the tray into the slots, or tap a tile to place it in the next empty slot. Tap a filled slot to send it back to the tray. You must use all tiles.',
  },
  lumis: {
    title: 'How to play Lumis',
    body: 'A pattern of lit cells appears on the grid, then goes dark once you pick up your first piece. Recreate the pattern from memory by dragging each piece into the correct place, or clicking a piece then clicking the correct cell to place it. You can reset the board at any time to see the pattern again.',
  },
  verba: {
    title: 'How to play Verba',
    body: 'Place letter tiles onto the grid to form words across rows and columns. Letters always fall to the bottom of the column when placed. Words are detected automatically — longer words and rarer letters score more points. Arrange your tiles to maximize your score before time runs out.',
  },
  aquarum: {
    title: 'How to play Aquarum',
    body: 'Rotate the pipe segments to connect each colored inlet to its matching colored outlet. Tap any pipe to rotate it. All paths must be completed to solve the puzzle.',
  },
  compondus: {
    title: 'How to play Compondus',
    body: "You are shown two words — the top and bottom of a chain. Fill in the missing words so each consecutive pair forms a compound word or phrase. The first letter of each hidden word is revealed as a hint. Wrong guesses reveal the next letter. Lower score is better.",
  },
  loopa: {
    title: 'How to play Loopa',
    body: "Draw a single closed loop through the dots of the grid. Click the lines between dots to toggle them on or off. Numbers inside squares show exactly how many of that square's four sides must be part of the loop.",
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

export default function HomeContent() {
  // ssr: false guarantees window/localStorage are available here — no useEffect needed
  const [{ today, played, streaks }] = useState(() => {
    const d = getTodaysCT()
    const p: Record<string, boolean> = {}
    const s: Record<string, number> = {}
    for (const g of GAMES) {
      p[g.key] = hasPlayed(g.key, d)
      s[g.key] = computeStreak(g.key, d)
    }
    return { today: d, played: p, streaks: s }
  })

  const [tutorialGame, setTutorialGame] = useState<string | null>(null)

  return (
    <main className="min-h-screen flex flex-col items-center p-6 pb-16">
      <div className="w-full max-w-sm md:max-w-2xl flex flex-col items-center gap-8 mt-8">
        <div className="flex flex-col items-center gap-1">
          <h1 className="font-serif text-5xl text-center">Compound Games</h1>
          <p className="text-sm text-[#aaa] text-center pt-1">
            Six daily puzzles · resets at midnight
          </p>
          {today && (
            <p className="text-[0.65rem] text-[#c5bcbc] uppercase tracking-widest mt-1">
              {new Date(today + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
          {GAMES.map(g => {
            const done = played[g.key] ?? false
            const streak = streaks[g.key] ?? 0
            return (
              <div
                key={g.key}
                className="relative flex items-center gap-3 px-6 py-6 border border-[#f0f0f0] rounded-2xl hover:border-[#ddd] transition-colors bg-white"
              >
                <Link href={g.href} className="absolute inset-0 rounded-2xl" aria-label={g.name} />
                <div className="flex-1 select-none">
                  <div className="font-serif text-2xl">{g.name}</div>
                  <div className="text-sm text-[#aaa]">{g.desc}</div>
                </div>
                <div className="flex items-center gap-2 select-none">
                  {streak > 0 && (
                    <span className="text-xs text-[#f59e0b] font-medium">{streak}🔥</span>
                  )}
                  {done ? (
                    <span className="text-xs font-medium text-[#059669] bg-[#d1fae5] px-2 py-0.5 rounded-full">✓ Done</span>
                  ) : (
                    <span className="text-xs font-medium text-[#aaa] bg-[#f5f5f5] px-2 py-0.5 rounded-full">Play</span>
                  )}
                </div>
                <button
                  onClick={() => setTutorialGame(g.key)}
                  className="relative z-10 w-7 h-7 shrink-0 rounded-full border border-[#e8e8e8] text-[#ccc] text-xs hover:border-[#bbb] hover:text-[#555] transition-colors flex items-center justify-center"
                  aria-label={`How to play ${g.name}`}
                >
                  ?
                </button>
              </div>
            )
          })}
        </div>

      </div>

      <footer className="fixed bottom-0 left-0 right-0 flex justify-center pb-4 pt-2 bg-white/90 backdrop-blur-sm border-t border-[#f0f0f0]">
        <a
          href="https://buymeacoffee.com/compoundgames"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#bbb] hover:text-[#888] transition-colors"
        >
          ☕ Support this project
        </a>
      </footer>

      {tutorialGame && (
        <TutorialModal game={tutorialGame} onClose={() => setTutorialGame(null)} />
      )}
    </main>
  )
}
