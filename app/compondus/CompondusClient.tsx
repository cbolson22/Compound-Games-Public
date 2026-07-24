'use client'

import dynamic from 'next/dynamic'
import type { CompondusPuzzle } from '@/lib/puzzles/compondus'

const CompondusBoard = dynamic<{ puzzle: CompondusPuzzle; puzzleId: string | null; puzzleDate: string; puzzleNumber: number; isArchive?: boolean }>(
  () => import('@/components/games/compondus/CompondusBoard'),
  { ssr: false }
)

export default function CompondusClient({
  puzzle,
  puzzleId,
  puzzleDate,
  puzzleNumber,
  isArchive,
}: {
  puzzle: CompondusPuzzle
  puzzleId: string | null
  puzzleDate: string
  puzzleNumber: number
  isArchive?: boolean
}) {
  return <CompondusBoard puzzle={puzzle} puzzleId={puzzleId} puzzleDate={puzzleDate} puzzleNumber={puzzleNumber} isArchive={isArchive} />
}
