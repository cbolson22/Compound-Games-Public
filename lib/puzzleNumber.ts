// The date of Puzzle #1 — run `SELECT MIN(puzzle_date) FROM daily_puzzles` to confirm
export const PUZZLE_EPOCH = "2026-05-15"

export function getPuzzleNumber(date: string): number {
  const epoch = new Date(PUZZLE_EPOCH + 'T12:00:00')
  const d = new Date(date + 'T12:00:00')
  return Math.max(1, Math.round((d.getTime() - epoch.getTime()) / 86400000) + 1)
}
