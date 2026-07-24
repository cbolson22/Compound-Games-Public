import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getTodaysCT } from '@/lib/dates'
import ArchiveIndexClient from './ArchiveIndexClient'

export const dynamic = 'force-dynamic'

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

export default async function ArchivePage() {
  const today = getTodaysCT()
  const { data } = await supabase
    .from('daily_puzzles')
    .select('game, puzzle_date')
    .lt('puzzle_date', today)

  const gameDates: Record<string, string[]> = {}
  for (const row of data ?? []) {
    const g = row.game as string
    if (!gameDates[g]) gameDates[g] = []
    gameDates[g].push(row.puzzle_date as string)
  }

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

        <ArchiveIndexClient games={GAMES} gameDates={gameDates} />
      </div>
    </main>
  )
}
