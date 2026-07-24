import type { Metadata } from 'next'
import Link from 'next/link'
import NumerisClient from './NumerisClient'
import { supabase } from '@/lib/supabase'
import { getTodaysCT } from '@/lib/dates'
import { generateNumeris } from '@/lib/puzzles/numeris'
import { getGamePuzzleNumber } from '@/lib/puzzleNumber'
import type { Puzzle } from '@/components/games/numeris/useNumeris'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Numeris — Compound Games',
}

async function getTodaysPuzzle(): Promise<{ puzzle: Puzzle; puzzleId: string | null; puzzleDate: string; puzzleNumber: number }> {
  const today = getTodaysCT()
  const { data } = await supabase.from('daily_puzzles').select('id, puzzle_data').eq('game', 'numeris').eq('puzzle_date', today).single()
  return {
    puzzle: (data?.puzzle_data as Puzzle) ?? generateNumeris(),
    puzzleId: data?.id ?? null,
    puzzleDate: today,
    puzzleNumber: getGamePuzzleNumber('numeris', today),
  }
}

export default async function NumerisPage() {
  const { puzzle, puzzleId, puzzleDate, puzzleNumber } = await getTodaysPuzzle()
  return (
    <>
      <nav className="px-5 pt-5">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#555] border border-[#e8e8e8] rounded-full px-4 py-1.5 bg-white hover:border-[#bbb] hover:text-[#1a1a1a] transition-all">
          ← Home
        </Link>
      </nav>
      <NumerisClient puzzle={puzzle} puzzleId={puzzleId} puzzleDate={puzzleDate} puzzleNumber={puzzleNumber} />
    </>
  )
}
