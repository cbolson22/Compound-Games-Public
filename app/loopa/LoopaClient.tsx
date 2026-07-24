'use client'

import dynamic from 'next/dynamic'
import type { LoopaPuzzle } from '@/lib/puzzles/loopa'

const LoopaBoard = dynamic<{ puzzle: LoopaPuzzle; puzzleId: string | null; puzzleDate: string; puzzleNumber: number; isArchive?: boolean }>(
  () => import('@/components/games/loopa/LoopaBoard'),
  { ssr: false }
)

export default function LoopaClient({
  puzzle,
  puzzleId,
  puzzleDate,
  puzzleNumber,
  isArchive,
}: {
  puzzle: LoopaPuzzle
  puzzleId: string | null
  puzzleDate: string
  puzzleNumber: number
  isArchive?: boolean
}) {
  return <LoopaBoard puzzle={puzzle} puzzleId={puzzleId} puzzleDate={puzzleDate} puzzleNumber={puzzleNumber} isArchive={isArchive} />
}
