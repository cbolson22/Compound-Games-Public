'use client'

import dynamic from 'next/dynamic'
import type { LoopaPuzzle } from '@/lib/puzzles/loopa'

const LoopaBoard = dynamic<{ puzzle: LoopaPuzzle; puzzleId: string | null; puzzleDate: string; puzzleNumber: number }>(
  () => import('@/components/games/loopa/LoopaBoard'),
  { ssr: false }
)

export default function LoopaClient({
  puzzle,
  puzzleId,
  puzzleDate,
  puzzleNumber,
}: {
  puzzle: LoopaPuzzle
  puzzleId: string | null
  puzzleDate: string
  puzzleNumber: number
}) {
  return <LoopaBoard puzzle={puzzle} puzzleId={puzzleId} puzzleDate={puzzleDate} puzzleNumber={puzzleNumber} />
}
