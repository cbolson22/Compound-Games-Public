import { supabase } from './supabase'
import type { GameResult, AnonPlay } from './localStorage'
import { populateFromDBResult, setCurrentUser, getAnonPlays, transferAnonToAccount } from './localStorage'

export type { AnonPlay }

export async function saveScoreToSupabase(
  game: string,
  puzzleDate: string,
  isArchive: boolean,
  result: GameResult,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return
  await supabase.from('public_scores').upsert({
    user_id: session.user.id,
    game,
    puzzle_date: puzzleDate,
    is_archive: isArchive,
    time_seconds: result.time_seconds ?? null,
    score: result.score ?? null,
    share: result.share,
    solve_data: result.solveData ?? null,
    completed_at: result.completed_at,
  }, { onConflict: 'user_id,game,puzzle_date,is_archive' })
}

// Fetch all scores from DB and write to cg_/cga_ localStorage namespace, then set current user
export async function populateLocalStorageFromDB(userId: string): Promise<void> {
  const { data } = await supabase
    .from('public_scores')
    .select('game, puzzle_date, is_archive, time_seconds, score, share, solve_data, completed_at')
    .eq('user_id', userId)
  if (!data) return
  for (const row of data) {
    populateFromDBResult(row.game as string, row.puzzle_date as string, row.is_archive as boolean, {
      time_seconds: row.time_seconds as number | null,
      score: row.score as number | null,
      share: row.share as string,
      solveData: row.solve_data as Record<string, unknown> | undefined,
      completed_at: row.completed_at as string,
    })
  }
  setCurrentUser(userId)
}

// Upload anon plays to DB, then move them to account namespace and delete cgx_ keys
export async function syncAnonPlaysToSupabase(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return
  const plays = getAnonPlays()
  if (plays.length === 0) return
  const rows = plays.map(({ game, date, isArchive, result }) => ({
    user_id: session.user.id,
    game,
    puzzle_date: date,
    is_archive: isArchive,
    time_seconds: result.time_seconds ?? null,
    score: result.score ?? null,
    share: result.share,
    solve_data: result.solveData ?? null,
    completed_at: result.completed_at,
  }))
  await supabase.from('public_scores').upsert(rows, {
    onConflict: 'user_id,game,puzzle_date,is_archive',
    ignoreDuplicates: true,
  })
  transferAnonToAccount(plays)
}

export async function registerPublicUser(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return
  await supabase.from('public_app_users').upsert(
    { user_id: session.user.id },
    { onConflict: 'user_id', ignoreDuplicates: true },
  )
}
