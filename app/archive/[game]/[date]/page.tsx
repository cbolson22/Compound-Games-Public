import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getTodaysCT } from '@/lib/dates'
import { getGamePuzzleNumber } from '@/lib/puzzleNumber'
import NumerisClient from '@/app/numeris/NumerisClient'
import LumisClient from '@/app/lumis/LumisClient'
import VerbaClient from '@/app/verba/VerbaClient'
import AquarumClient from '@/app/aquarum/AquarumClient'
import CompondusClient from '@/app/compondus/CompondusClient'
import LoopaClient from '@/app/loopa/LoopaClient'
import type { Puzzle as NumerisPuzzle } from '@/components/games/numeris/useNumeris'
import type { LumisPuzzle } from '@/components/games/lumis/useLumis'
import type { VerbaPuzzle } from '@/lib/puzzles/verba'
import type { AquarumPuzzle } from '@/components/games/aquarum/useAquarum'
import type { CompondusPuzzle } from '@/lib/puzzles/compondus'
import type { LoopaPuzzle } from '@/lib/puzzles/loopa'

export const dynamic = 'force-dynamic'

const GAME_NAMES: Record<string, string> = {
  numeris: 'Numeris', lumis: 'Lumis', verba: 'Verba',
  aquarum: 'Aquarum', compondus: 'Compondus', loopa: 'Loopa',
}

export async function generateMetadata({ params }: { params: Promise<{ game: string; date: string }> }): Promise<Metadata> {
  const { game, date } = await params
  const name = GAME_NAMES[game]
  if (!name) return { title: 'Archive — Compound Games' }
  return { title: `${name} #${getGamePuzzleNumber(game, date)} — Compound Games` }
}

export default async function ArchiveDatePage({ params }: { params: Promise<{ game: string; date: string }> }) {
  const { game, date } = await params

  if (!GAME_NAMES[game]) notFound()

  // Must be a past date
  const today = getTodaysCT()
  if (date >= today) notFound()

  const { data } = await supabase
    .from('daily_puzzles')
    .select('id, puzzle_data')
    .eq('game', game)
    .eq('puzzle_date', date)
    .single()

  if (!data) notFound()

  const puzzleNumber = getGamePuzzleNumber(game, date)
  const puzzleId: string = data.id
  const puzzleData = data.puzzle_data
  const formatted = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <>
      <nav className="px-5 pt-5 flex items-center gap-2">
        <Link
          href={`/archive/${game}`}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#555] border border-[#e8e8e8] rounded-full px-4 py-1.5 bg-white hover:border-[#bbb] hover:text-[#1a1a1a] transition-all"
        >
          ← {GAME_NAMES[game]} Archive
        </Link>
        <span className="text-xs text-[#bbb]">{formatted}</span>
      </nav>

      {game === 'numeris' && (
        <NumerisClient puzzle={puzzleData as NumerisPuzzle} puzzleId={puzzleId} puzzleDate={date} puzzleNumber={puzzleNumber} isArchive />
      )}
      {game === 'lumis' && (
        <LumisClient puzzle={puzzleData as LumisPuzzle} puzzleId={puzzleId} puzzleDate={date} puzzleNumber={puzzleNumber} isArchive />
      )}
      {game === 'verba' && (
        <VerbaClient puzzle={puzzleData as VerbaPuzzle} puzzleId={puzzleId} puzzleDate={date} puzzleNumber={puzzleNumber} isArchive />
      )}
      {game === 'aquarum' && (
        <AquarumClient puzzle={puzzleData as AquarumPuzzle} puzzleId={puzzleId} puzzleDate={date} puzzleNumber={puzzleNumber} isArchive />
      )}
      {game === 'compondus' && (
        <CompondusClient puzzle={puzzleData as CompondusPuzzle} puzzleId={puzzleId} puzzleDate={date} puzzleNumber={puzzleNumber} isArchive />
      )}
      {game === 'loopa' && (
        <LoopaClient puzzle={puzzleData as LoopaPuzzle} puzzleId={puzzleId} puzzleDate={date} puzzleNumber={puzzleNumber} isArchive />
      )}
    </>
  )
}
