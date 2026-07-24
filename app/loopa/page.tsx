import type { Metadata } from 'next'
import Link from 'next/link'
import LoopaClient from './LoopaClient'
import { supabase } from '@/lib/supabase'
import { getTodaysCT } from '@/lib/dates'
import { generateLoopa, type LoopaPuzzle } from '@/lib/puzzles/loopa'
import { getGamePuzzleNumber } from '@/lib/puzzleNumber'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Loopa — Compound Games',
}

async function getTodaysPuzzle(): Promise<{ puzzle: LoopaPuzzle; puzzleId: string | null; puzzleDate: string; puzzleNumber: number }> {
  const today = getTodaysCT()
  const { data } = await supabase.from('daily_puzzles').select('id, puzzle_data').eq('game', 'loopa').eq('puzzle_date', today).single()
  return {
    puzzle: (data?.puzzle_data as LoopaPuzzle) ?? generateLoopa(),
    puzzleId: data?.id ?? null,
    puzzleDate: today,
    puzzleNumber: getGamePuzzleNumber('loopa', today),
  }
}

export default async function LoopaPage() {
  const { puzzle, puzzleId, puzzleDate, puzzleNumber } = await getTodaysPuzzle()
  return (
    <>
      <nav className="px-5 pt-5">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#555] border border-[#e8e8e8] rounded-full px-4 py-1.5 bg-white hover:border-[#bbb] hover:text-[#1a1a1a] transition-all">
          ← Home
        </Link>
      </nav>
      <LoopaClient puzzle={puzzle} puzzleId={puzzleId} puzzleDate={puzzleDate} puzzleNumber={puzzleNumber} />
    </>
  )
}
