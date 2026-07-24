import { dayBefore } from './dates'

export type GameResult = {
  time_seconds: number | null
  score: number | null
  completed_at: string
  share: string
}

const key = (game: string, date: string) => `cg_${game}_${date}`

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
  if (typeof window === 'undefined') return null
  let best: number | null = null
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k?.startsWith(`cg_${game}_`)) continue
    try {
      const r = JSON.parse(localStorage.getItem(k)!) as GameResult
      if (r.time_seconds !== null && (best === null || r.time_seconds < best)) {
        best = r.time_seconds
      }
    } catch { /* skip */ }
  }
  return best
}

export function getBestScore(game: string): number | null {
  if (typeof window === 'undefined') return null
  let best: number | null = null
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k?.startsWith(`cg_${game}_`)) continue
    try {
      const r = JSON.parse(localStorage.getItem(k)!) as GameResult
      if (r.score !== null && (best === null || r.score > best)) {
        best = r.score
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
