'use client'

import { useState } from 'react'
import Link from 'next/link'
import { hasPlayedArchive } from '@/lib/localStorage'

type DateEntry = { date: string; puzzleNumber: number }

export default function ArchiveGameContent({ game, dates }: { game: string; dates: DateEntry[] }) {
  const [statusMap] = useState(() => {
    const map: Record<string, 'done' | 'inprog' | 'play'> = {}
    for (const { date } of dates) {
      if (hasPlayedArchive(game, date)) map[date] = 'done'
      else if (localStorage.getItem(`${game}-inprog-${date}`)) map[date] = 'inprog'
      else map[date] = 'play'
    }
    return map
  })

  // Group dates by month
  const byMonth: { label: string; entries: DateEntry[] }[] = []
  for (const entry of dates) {
    const label = new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const last = byMonth[byMonth.length - 1]
    if (last?.label === label) {
      last.entries.push(entry)
    } else {
      byMonth.push({ label, entries: [entry] })
    }
  }

  if (dates.length === 0) {
    return <p className="text-sm text-[#bbb]">No past puzzles yet.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {byMonth.map(({ label, entries }) => (
        <div key={label} className="flex flex-col gap-2">
          <h2 className="text-xs font-medium text-[#aaa] uppercase tracking-widest">{label}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {entries.map(({ date, puzzleNumber }) => {
              const status = statusMap[date] ?? 'play'
              const formatted = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
              })
              return (
                <Link
                  key={date}
                  href={`/archive/${game}/${date}`}
                  className="flex items-center justify-between px-5 py-4 border border-[#f0f0f0] rounded-2xl hover:border-[#ddd] transition-colors bg-white"
                >
                  <div>
                    <div className="text-sm font-medium text-[#1a1a1a]">{formatted}</div>
                    <div className="text-xs text-[#bbb]">#{puzzleNumber}</div>
                  </div>
                  {status === 'done' && (
                    <span className="text-xs font-medium text-[#059669] bg-[#d1fae5] px-2 py-0.5 rounded-full">✓ Done</span>
                  )}
                  {status === 'inprog' && (
                    <span className="text-xs font-medium text-[#d97706] bg-[#fef3c7] px-2 py-0.5 rounded-full">Continue</span>
                  )}
                  {status === 'play' && (
                    <span className="text-xs font-medium text-[#aaa] bg-[#f5f5f5] px-2 py-0.5 rounded-full">Play</span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
