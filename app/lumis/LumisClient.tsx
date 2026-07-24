'use client'

import dynamic from 'next/dynamic'
import type { LumisPuzzle } from '@/components/games/lumis/useLumis'

const LumisBoard = dynamic<{ puzzle: LumisPuzzle; puzzleId: string | null; puzzleDate: string; puzzleNumber: number }>(
  () => import('@/components/games/lumis/LumisBoard'),
  { ssr: false }
)

export default function LumisClient({
  puzzle,
  puzzleId,
  puzzleDate,
  puzzleNumber,
}: {
  puzzle: LumisPuzzle
  puzzleId: string | null
  puzzleDate: string
  puzzleNumber: number
}) {
  return <LumisBoard puzzle={puzzle} puzzleId={puzzleId} puzzleDate={puzzleDate} puzzleNumber={puzzleNumber} />
}
