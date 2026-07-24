'use client'

import dynamic from 'next/dynamic'
import type { Puzzle } from '@/components/games/numeris/useNumeris'

const NumerisBoard = dynamic<{ puzzle: Puzzle; puzzleId: string | null; puzzleDate: string; puzzleNumber: number; isArchive?: boolean }>(
  () => import('@/components/games/numeris/NumerisBoard'),
  { ssr: false }
)

export default function NumerisClient({
  puzzle,
  puzzleId,
  puzzleDate,
  puzzleNumber,
  isArchive,
}: {
  puzzle: Puzzle
  puzzleId: string | null
  puzzleDate: string
  puzzleNumber: number
  isArchive?: boolean
}) {
  return <NumerisBoard puzzle={puzzle} puzzleId={puzzleId} puzzleDate={puzzleDate} puzzleNumber={puzzleNumber} isArchive={isArchive} />
}
