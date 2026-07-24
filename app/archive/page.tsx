import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Archive — Compound Games',
}

const GAMES = [
  { key: 'numeris', name: 'Numeris', desc: 'Daily Number Puzzle' },
  { key: 'lumis', name: 'Lumis', desc: 'Daily Memory Puzzle' },
  { key: 'verba', name: 'Verba', desc: 'Daily Word Game' },
  { key: 'aquarum', name: 'Aquarum', desc: 'Daily Pipe Puzzle' },
  { key: 'compondus', name: 'Compondus', desc: 'Daily Word Chain' },
  { key: 'loopa', name: 'Loopa', desc: 'Daily Loop Puzzle' },
] as const

export default function ArchivePage() {
  return (
    <main className="min-h-screen flex flex-col items-center p-6 pb-16">
      <div className="w-full max-w-sm md:max-w-2xl flex flex-col gap-8 mt-8">
        <div className="flex flex-col items-center gap-1">
          <nav className="self-start">
            <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#555] border border-[#e8e8e8] rounded-full px-4 py-1.5 bg-white hover:border-[#bbb] hover:text-[#1a1a1a] transition-all">
              ← Home
            </Link>
          </nav>
          <h1 className="font-serif text-4xl text-center mt-4">Archive</h1>
          <p className="text-sm text-[#aaa] text-center">Browse past puzzles by game</p>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
          {GAMES.map(g => (
            <Link
              key={g.key}
              href={`/archive/${g.key}`}
              className="flex items-center gap-3 px-6 py-6 border border-[#f0f0f0] rounded-2xl hover:border-[#ddd] transition-colors bg-white"
            >
              <div className="flex-1">
                <div className="font-serif text-2xl">{g.name}</div>
                <div className="text-sm text-[#aaa]">{g.desc}</div>
              </div>
              <span className="text-[#bbb] text-sm">→</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
