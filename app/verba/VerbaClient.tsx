'use client'

import dynamic from 'next/dynamic'
import type { VerbaPuzzle } from '@/lib/puzzles/verba'

const VerbaBoard = dynamic<{ puzzle: VerbaPuzzle; puzzleId: string | null; puzzleDate: string; puzzleNumber: number }>(
  () => import('@/components/games/verba/VerbaBoard'),
  { ssr: false }
)

export default function VerbaClient({
  puzzle,
  puzzleId,
  puzzleDate,
  puzzleNumber,
}: {
  puzzle: VerbaPuzzle
  puzzleId: string | null
  puzzleDate: string
  puzzleNumber: number
}) {
  return <VerbaBoard puzzle={puzzle} puzzleId={puzzleId} puzzleDate={puzzleDate} puzzleNumber={puzzleNumber} />
}
