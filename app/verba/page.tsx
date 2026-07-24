import type { Metadata } from 'next'
import Link from 'next/link'
import VerbaClient from './VerbaClient'
import { supabase } from '@/lib/supabase'
import { getTodaysCT } from '@/lib/dates'
import { generateVerba, type VerbaPuzzle } from '@/lib/puzzles/verba'
import { getPuzzleNumber } from '@/lib/puzzleNumber'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Verba — Compound Games',
}

async function getTodaysPuzzle(): Promise<{ puzzle: VerbaPuzzle; puzzleId: string | null; puzzleDate: string; puzzleNumber: number }> {
  const today = getTodaysCT()
  const { data } = await supabase
    .from('daily_puzzles')
    .select('id, puzzle_data')
    .eq('game', 'verba')
    .eq('puzzle_date', today)
    .single()
  return {
    puzzle: (data?.puzzle_data as VerbaPuzzle) ?? generateVerba(),
    puzzleId: data?.id ?? null,
    puzzleDate: today,
    puzzleNumber: getPuzzleNumber(today),
  }
}

export default async function VerbaPage() {
  const { puzzle, puzzleId, puzzleDate, puzzleNumber } = await getTodaysPuzzle()
  return (
    <>
      <nav className="px-5 pt-5">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#555] border border-[#e8e8e8] rounded-full px-4 py-1.5 bg-white hover:border-[#bbb] hover:text-[#1a1a1a] transition-all">
          ← Home
        </Link>
      </nav>
      <VerbaClient puzzle={puzzle} puzzleId={puzzleId} puzzleDate={puzzleDate} puzzleNumber={puzzleNumber} />
    </>
  )
}
