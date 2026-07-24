'use client'

import dynamic from 'next/dynamic'
import type { AquarumPuzzle } from '@/components/games/aquarum/useAquarum'

const AquarumBoard = dynamic<{ puzzle: AquarumPuzzle; puzzleId: string | null; puzzleDate: string; puzzleNumber: number; isArchive?: boolean }>(
  () => import('@/components/games/aquarum/AquarumBoard'),
  { ssr: false }
)

export default function AquarumClient({
  puzzle,
  puzzleId,
  puzzleDate,
  puzzleNumber,
  isArchive,
}: {
  puzzle: AquarumPuzzle
  puzzleId: string | null
  puzzleDate: string
  puzzleNumber: number
  isArchive?: boolean
}) {
  return <AquarumBoard puzzle={puzzle} puzzleId={puzzleId} puzzleDate={puzzleDate} puzzleNumber={puzzleNumber} isArchive={isArchive} />
}
