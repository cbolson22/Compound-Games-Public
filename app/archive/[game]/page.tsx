import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getTodaysCT } from '@/lib/dates'
import { getGamePuzzleNumber } from '@/lib/puzzleNumber'
import ArchiveGameClient from './ArchiveGameClient'

export const dynamic = 'force-dynamic'

const GAME_NAMES: Record<string, string> = {
  numeris: 'Numeris',
  lumis: 'Lumis',
  verba: 'Verba',
  aquarum: 'Aquarum',
  compondus: 'Compondus',
  loopa: 'Loopa',
}

export async function generateMetadata({ params }: { params: Promise<{ game: string }> }): Promise<Metadata> {
  const { game } = await params
  const name = GAME_NAMES[game]
  return { title: name ? `${name} Archive — Compound Games` : 'Archive — Compound Games' }
}

export default async function ArchiveGamePage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params
  if (!GAME_NAMES[game]) notFound()

  const today = getTodaysCT()
  const { data } = await supabase
    .from('daily_puzzles')
    .select('puzzle_date')
    .eq('game', game)
    .lt('puzzle_date', today)
    .order('puzzle_date', { ascending: false })

  const dates = (data ?? []).map(r => ({
    date: r.puzzle_date as string,
    puzzleNumber: getGamePuzzleNumber(game, r.puzzle_date as string),
  }))

  return (
    <main className="min-h-screen flex flex-col items-center p-6 pb-16">
      <div className="w-full max-w-sm md:max-w-2xl flex flex-col gap-6 mt-8">
        <div className="flex flex-col gap-4">
          <nav className="flex items-center gap-2">
            <Link href="/archive" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#555] border border-[#e8e8e8] rounded-full px-4 py-1.5 bg-white hover:border-[#bbb] hover:text-[#1a1a1a] transition-all">
              ← Archive
            </Link>
          </nav>
          <h1 className="font-serif text-4xl">{GAME_NAMES[game]}</h1>
          <p className="text-sm text-[#aaa]">{dates.length} past puzzle{dates.length !== 1 ? 's' : ''}</p>
        </div>

        <ArchiveGameClient game={game} dates={dates} />
      </div>
    </main>
  )
}
