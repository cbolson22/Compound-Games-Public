'use client'

import dynamic from 'next/dynamic'

type DateEntry = { date: string; puzzleNumber: number }

const ArchiveGameContent = dynamic(
  () => import('./ArchiveGameContent'),
  { ssr: false }
)

export default function ArchiveGameClient({ game, dates }: { game: string; dates: DateEntry[] }) {
  return <ArchiveGameContent game={game} dates={dates} />
}
