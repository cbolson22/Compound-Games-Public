'use client'

import { useState } from 'react'
import Link from 'next/link'
import { hasPlayedArchive } from '@/lib/localStorage'

type Game = { key: string; name: string; desc: string }

const GAME_COLORS: Record<string, string> = {
  numeris: '#3b82f6',
  lumis: '#f59e0b',
  verba: '#10b981',
  aquarum: '#06b6d4',
  compondus: '#8b5cf6',
  loopa: '#6366f1',
}

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
        const pct = total > 0 ? (completed / total) * 100 : 0
        const color = GAME_COLORS[g.key] ?? '#aaa'
        return (
          <Link
            key={g.key}
            href={`/archive/${g.key}`}
            className="flex flex-col gap-3 px-6 py-5 border border-[#e8e8e8] rounded-2xl hover:border-[#d0d0d0] transition-all bg-white shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <div className="font-serif text-2xl">{g.name}</div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs font-medium text-[#1a1a1a]">{completed}/{total}</span>
                <span className="text-[10px] text-[#bbb]">completed</span>
              </div>
            </div>
            <div className="w-full h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
