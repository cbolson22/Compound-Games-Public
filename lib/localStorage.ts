import { dayBefore } from './dates'

export type GameResult = {
  time_seconds?: number | null
  score?: number | null
  completed_at: string
  share: string
  solveData?: Record<string, unknown>
}

const GAMES = ['numeris', 'lumis', 'verba', 'aquarum', 'compondus', 'loopa']

// ── Namespace helpers ────────────────────────────────────────────────────────

export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('cg_current_user')
}

export function setCurrentUser(userId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('cg_current_user', userId)
}

export function clearCurrentUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('cg_current_user')
}

// account-namespace keys (cleared on logout, populated from DB on login)
const accountKey = (game: string, date: string) => `cg_${game}_${date}`
const accountArchiveKey = (game: string, date: string) => `cga_${game}_${date}`

// anon-namespace keys (persist forever, untouched by login/logout)
const anonKey = (game: string, date: string) => `cgx_${game}_${date}`
const anonArchiveKey = (game: string, date: string) => `cgxa_${game}_${date}`

function dailyKey(game: string, date: string): string {
  return isLoggedIn() ? accountKey(game, date) : anonKey(game, date)
}

function archiveKey(game: string, date: string): string {
  return isLoggedIn() ? accountArchiveKey(game, date) : anonArchiveKey(game, date)
}

// ── One-time migration ───────────────────────────────────────────────────────

// Renames pre-existing cg_/cga_ game keys → cgx_/cgxa_ (treats them as anonymous)
export function migrateToAnonNamespace(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem('cg_migrated_v2')) return
  const toRename: [string, string][] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k) continue
    if (k.startsWith('cg_')) {
      const rest = k.slice(3)
      if (GAMES.some(g => rest.startsWith(g + '_')))
        toRename.push([k, 'cgx_' + rest])
    } else if (k.startsWith('cga_')) {
      const rest = k.slice(4)
      if (GAMES.some(g => rest.startsWith(g + '_')))
        toRename.push([k, 'cgxa_' + rest])
    }
  }
  for (const [oldKey, newKey] of toRename) {
    const val = localStorage.getItem(oldKey)
    if (val) {
      localStorage.setItem(newKey, val)
      localStorage.removeItem(oldKey)
    }
  }
  localStorage.setItem('cg_migrated_v2', '1')
}

// ── Account namespace management ─────────────────────────────────────────────

// Delete all cg_/cga_ game keys — called on logout
export function clearAccountLocalStorage(): void {
  if (typeof window === 'undefined') return
  const keysToDelete: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k) continue
    if (k.startsWith('cg_')) {
      const rest = k.slice(3)
      if (GAMES.some(g => rest.startsWith(g + '_'))) keysToDelete.push(k)
    } else if (k.startsWith('cga_')) {
      const rest = k.slice(4)
      if (GAMES.some(g => rest.startsWith(g + '_'))) keysToDelete.push(k)
    }
  }
  for (const k of keysToDelete) localStorage.removeItem(k)
}

// Write a DB-sourced result to the account namespace (used on login)
export function populateFromDBResult(
  game: string,
  puzzleDate: string,
  isArchive: boolean,
  result: GameResult,
): void {
  if (typeof window === 'undefined') return
  const k = isArchive ? accountArchiveKey(game, puzzleDate) : accountKey(game, puzzleDate)
  localStorage.setItem(k, JSON.stringify(result))
}

// ── Anon sync helpers ────────────────────────────────────────────────────────

export type AnonPlay = {
  game: string
  date: string
  isArchive: boolean
  result: GameResult
}

// Get all unsynced (cgx_/cgxa_) plays for the sync offer
export function getAnonPlays(): AnonPlay[] {
  if (typeof window === 'undefined') return []
  const plays: AnonPlay[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k) continue
    const isDaily = k.startsWith('cgx_')
    const isArc = k.startsWith('cgxa_')
    if (!isDaily && !isArc) continue
    const prefix = isDaily ? 'cgx_' : 'cgxa_'
    const rest = k.slice(prefix.length)
    const underscoreIdx = rest.indexOf('_')
    if (underscoreIdx === -1) continue
    const game = rest.slice(0, underscoreIdx)
    const date = rest.slice(underscoreIdx + 1)
    if (!GAMES.includes(game)) continue
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    try {
      const result = JSON.parse(localStorage.getItem(k)!) as GameResult
      if (!result.completed_at || !result.share) continue
      plays.push({ game, date, isArchive: isArc, result })
    } catch { /* skip */ }
  }
  return plays
}

// Move anon plays → account namespace and delete cgx_/cgxa_ keys
export function transferAnonToAccount(plays: AnonPlay[]): void {
  if (typeof window === 'undefined') return
  for (const { game, date, isArchive, result } of plays) {
    const accountK = isArchive ? accountArchiveKey(game, date) : accountKey(game, date)
    const anonK = isArchive ? `cgxa_${game}_${date}` : `cgx_${game}_${date}`
    // DB version takes precedence — only write to account namespace if not already populated from DB
    if (!localStorage.getItem(accountK)) {
      localStorage.setItem(accountK, JSON.stringify(result))
    }
    localStorage.removeItem(anonK)
  }
}

// ── Core read/write ──────────────────────────────────────────────────────────

export function saveResult(game: string, date: string, result: GameResult): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(dailyKey(game, date), JSON.stringify(result))
}

export function getResult(game: string, date: string): GameResult | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(dailyKey(game, date))
  if (!raw) return null
  try { return JSON.parse(raw) as GameResult } catch { return null }
}

export function saveArchiveResult(game: string, date: string, result: GameResult): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(archiveKey(game, date), JSON.stringify(result))
}

export function getArchiveResult(game: string, date: string): GameResult | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(archiveKey(game, date))
  if (!raw) return null
  try { return JSON.parse(raw) as GameResult } catch { return null }
}

export function hasPlayed(game: string, date: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(dailyKey(game, date)) !== null
}

export function hasPlayedArchive(game: string, date: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(dailyKey(game, date)) !== null ||
         localStorage.getItem(archiveKey(game, date)) !== null
}

// ── Streak ───────────────────────────────────────────────────────────────────

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

export function getLongestStreak(game: string): number {
  if (typeof window === 'undefined') return 0
  const prefix = isLoggedIn() ? `cg_${game}_` : `cgx_${game}_`
  const dates: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(prefix)) dates.push(k.replace(prefix, ''))
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

// ── Stats ────────────────────────────────────────────────────────────────────

export function getBestTime(game: string): number | null {
  return getBestTimeEntry(game)?.value ?? null
}

export function getBestTimeEntry(game: string): { value: number; date: string } | null {
  if (typeof window === 'undefined') return null
  const loggedIn = isLoggedIn()
  const dailyPrefix = loggedIn ? `cg_${game}_` : `cgx_${game}_`
  const archivePrefix = loggedIn ? `cga_${game}_` : `cgxa_${game}_`
  let best: { value: number; date: string } | null = null
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    const isD = k?.startsWith(dailyPrefix)
    const isA = k?.startsWith(archivePrefix)
    if (!isD && !isA) continue
    try {
      const r = JSON.parse(localStorage.getItem(k!)!) as GameResult
      if (r.time_seconds != null && (best === null || r.time_seconds < best.value)) {
        const prefix = isD ? dailyPrefix : archivePrefix
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
  const loggedIn = isLoggedIn()
  const dailyPrefix = loggedIn ? `cg_${game}_` : `cgx_${game}_`
  const archivePrefix = loggedIn ? `cga_${game}_` : `cgxa_${game}_`
  let best: { value: number; date: string } | null = null
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    const isD = k?.startsWith(dailyPrefix)
    const isA = k?.startsWith(archivePrefix)
    if (!isD && !isA) continue
    try {
      const r = JSON.parse(localStorage.getItem(k!)!) as GameResult
      if (r.score != null && (best === null || r.score > best.value)) {
        const prefix = isD ? dailyPrefix : archivePrefix
        best = { value: r.score, date: k!.replace(prefix, '') }
      }
    } catch { /* skip */ }
  }
  return best
}

export function getLowestScoreEntry(game: string): { value: number; date: string } | null {
  if (typeof window === 'undefined') return null
  const loggedIn = isLoggedIn()
  const dailyPrefix = loggedIn ? `cg_${game}_` : `cgx_${game}_`
  const archivePrefix = loggedIn ? `cga_${game}_` : `cgxa_${game}_`
  let best: { value: number; date: string } | null = null
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    const isD = k?.startsWith(dailyPrefix)
    const isA = k?.startsWith(archivePrefix)
    if (!isD && !isA) continue
    try {
      const r = JSON.parse(localStorage.getItem(k!)!) as GameResult
      if (r.score != null && (best === null || r.score < best.value)) {
        const prefix = isD ? dailyPrefix : archivePrefix
        best = { value: r.score, date: k!.replace(prefix, '') }
      }
    } catch { /* skip */ }
  }
  return best
}

export function getVerbaBestWord(): { word: string; score: number; date: string } | null {
  if (typeof window === 'undefined') return null
  const loggedIn = isLoggedIn()
  const dailyPrefix = loggedIn ? 'cg_verba_' : 'cgx_verba_'
  const archivePrefix = loggedIn ? 'cga_verba_' : 'cgxa_verba_'
  let best: { word: string; score: number; date: string } | null = null
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    const isD = k?.startsWith(dailyPrefix)
    const isA = k?.startsWith(archivePrefix)
    if (!isD && !isA) continue
    try {
      const r = JSON.parse(localStorage.getItem(k!)!) as GameResult
      const words = r.solveData?.words as { word: string; score: number }[] | undefined
      if (!words) continue
      const prefix = isD ? dailyPrefix : archivePrefix
      const date = k!.replace(prefix, '')
      for (const w of words) {
        if (!best || w.score > best.score) best = { ...w, date }
      }
    } catch { /* skip */ }
  }
  return best
}

export function getTotalPlayed(game: string): number {
  if (typeof window === 'undefined') return 0
  const prefix = isLoggedIn() ? `cg_${game}_` : `cgx_${game}_`
  let count = 0
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(prefix)) count++
  }
  return count
}

export function getPlayTimes(game: string): { earliest: string | null; latest: string | null } {
  if (typeof window === 'undefined') return { earliest: null, latest: null }
  const prefix = isLoggedIn() ? `cg_${game}_` : `cgx_${game}_`
  let earliestMin = Infinity, latestMin = -Infinity
  let earliest: string | null = null, latest: string | null = null
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k?.startsWith(prefix)) continue
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
