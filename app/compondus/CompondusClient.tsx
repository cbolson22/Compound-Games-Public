'use client'

import dynamic from 'next/dynamic'
import type { CompondusPuzzle } from '@/lib/puzzles/compondus'

const CompondusBoard = dynamic<{ puzzle: CompondusPuzzle; puzzleId: string | null; puzzleDate: string; puzzleNumber: number }>(
  () => import('@/components/games/compondus/CompondusBoard'),
  { ssr: false }
)

export default function CompondusClient({
  puzzle,
  puzzleId,
  puzzleDate,
  puzzleNumber,
}: {
  puzzle: CompondusPuzzle
  puzzleId: string | null
  puzzleDate: string
  puzzleNumber: number
}) {
  return <CompondusBoard puzzle={puzzle} puzzleId={puzzleId} puzzleDate={puzzleDate} puzzleNumber={puzzleNumber} />
}
