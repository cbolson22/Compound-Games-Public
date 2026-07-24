'use client'

import { useState } from 'react'
import Link from 'next/link'
import { hasPlayedArchive } from '@/lib/localStorage'

type Game = { key: string; name: string; desc: string }

export default function ArchiveIndexContent({
  games,
  gameDates,
}: {
  games: readonly Game[]
  gameDates: Record<string, string[]>
}) {
  const [completedMap] = useState(() => {
    const map: Record<string, number> = {}
    for (const { key } of games) {
      const dates = gameDates[key] ?? []
      map[key] = dates.filter(d => hasPlayedArchive(key, d)).length
    }
    return map
  })

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
      {games.map(g => {
        const total = gameDates[g.key]?.length ?? 0
        const completed = completedMap[g.key] ?? 0
        return (
          <Link
            key={g.key}
            href={`/archive/${g.key}`}
            className="flex items-center gap-3 px-6 py-6 border border-[#f0f0f0] rounded-2xl hover:border-[#ddd] transition-colors bg-white"
          >
            <div className="flex-1">
              <div className="font-serif text-2xl">{g.name}</div>
              <div className="text-sm text-[#aaa]">{g.desc}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs font-medium text-[#1a1a1a]">{completed}/{total}</span>
                <span className="text-[10px] text-[#bbb]">completed</span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
