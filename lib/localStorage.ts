import { dayBefore } from './dates'

export type GameResult = {
  time_seconds: number | null
  score?: number | null
  completed_at: string
  share: string
  solveData?: Record<string, unknown>
}

const key = (game: string, date: string) => `cg_${game}_${date}`
const archiveKey = (game: string, date: string) => `cga_${game}_${date}`

export function getArchiveResult(game: string, date: string): GameResult | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(archiveKey(game, date))
  if (!raw) return null
  try { return JSON.parse(raw) as GameResult } catch { return null }
}

export function saveArchiveResult(game: string, date: string, result: GameResult): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(archiveKey(game, date), JSON.stringify(result))
}

export function hasPlayedArchive(game: string, date: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(key(game, date)) !== null ||
         localStorage.getItem(archiveKey(game, date)) !== null
}

export function saveResult(game: string, date: string, result: GameResult): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key(game, date), JSON.stringify(result))
}

export function getResult(game: string, date: string): GameResult | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(key(game, date))
  if (!raw) return null
  try {
    return JSON.parse(raw) as GameResult
  } catch {
    return null
  }
}

export function hasPlayed(game: string, date: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(key(game, date)) !== null
}

// Walk backward from today counting consecutive played days
export function computeStreak(game: string, today: string): number {
  if (typeof window === 'undefined') return 0
  let streak = 0
  let d = today
  while (true) {
    if (!hasPlayed(game, d)) break
    streak++
    d = dayBefore(d)
  }
  return streak
}

export function getBestTime(game: string): number | null {
  return getBestTimeEntry(game)?.value ?? null
}

export function getBestTimeEntry(game: string): { value: number; date: string } | null {
  if (typeof window === 'undefined') return null
  let best: { value: number; date: string } | null = null
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    const isDaily = k?.startsWith(`cg_${game}_`)
    const isArchive = k?.startsWith(`cga_${game}_`)
    if (!isDaily && !isArchive) continue
    try {
      const r = JSON.parse(localStorage.getItem(k!)!) as GameResult
      if (r.time_seconds !== null && (best === null || r.time_seconds < best.value)) {
        const prefix = isDaily ? `cg_${game}_` : `cga_${game}_`
        best = { value: r.time_seconds, date: k!.replace(prefix, '') }
      }
    } catch { /* skip */ }
  }
  return best
}

export function getBestScore(game: string): number | null {
  return getBestScoreEntry(game)?.value ?? null
}

export function getBestScoreEntry(game: string): { value: number; date: string } | null {
  if (typeof window === 'undefined') return null
  let best: { value: number; date: string } | null = null
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    const isDaily = k?.startsWith(`cg_${game}_`)
    const isArchive = k?.startsWith(`cga_${game}_`)
    if (!isDaily && !isArchive) continue
    try {
      const r = JSON.parse(localStorage.getItem(k!)!) as GameResult
      if (r.score != null && (best === null || r.score > best.value)) {
        const prefix = isDaily ? `cg_${game}_` : `cga_${game}_`
        best = { value: r.score, date: k!.replace(prefix, '') }
      }
    } catch { /* skip */ }
  }
  return best
}

export function getLongestStreak(game: string): number {
  if (typeof window === 'undefined') return 0
  const dates: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(`cg_${game}_`)) dates.push(k.replace(`cg_${game}_`, ''))
  }
  if (dates.length === 0) return 0
  dates.sort()
  let longest = 1, current = 1
  for (let i = 1; i < dates.length; i++) {
    const diff = Math.round(
      (new Date(dates[i] + 'T12:00:00').getTime() - new Date(dates[i - 1] + 'T12:00:00').getTime()) / 86400000
    )
    current = diff === 1 ? current + 1 : 1
    if (current > longest) longest = current
  }
  return longest
}

export function getPlayTimes(game: string): { earliest: string | null; latest: string | null } {
  if (typeof window === 'undefined') return { earliest: null, latest: null }
  let earliestMin = Infinity, latestMin = -Infinity
  let earliest: string | null = null, latest: string | null = null
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k?.startsWith(`cg_${game}_`)) continue
    try {
      const r = JSON.parse(localStorage.getItem(k)!) as GameResult
      if (!r.completed_at) continue
      const d = new Date(r.completed_at)
      const mins = d.getHours() * 60 + d.getMinutes()
      const str = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      if (mins < earliestMin) { earliestMin = mins; earliest = str }
      if (mins > latestMin) { latestMin = mins; latest = str }
    } catch { /* skip */ }
  }
  return { earliest, latest }
}

export function getVerbaBestWord(): { word: string; score: number } | null {
  if (typeof window === 'undefined') return null
  let best: { word: string; score: number } | null = null
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k?.startsWith('cg_verba_')) continue
    try {
      const r = JSON.parse(localStorage.getItem(k)!) as GameResult
      const words = r.solveData?.words as { word: string; score: number }[] | undefined
      if (!words) continue
      for (const w of words) {
        if (!best || w.score > best.score) best = w
      }
    } catch { /* skip */ }
  }
  return best
}

export function getTotalPlayed(game: string): number {
  if (typeof window === 'undefined') return 0
  let count = 0
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(`cg_${game}_`)) count++
  }
  return count
}
