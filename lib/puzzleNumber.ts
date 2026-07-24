const GAME_EPOCHS: Record<string, string> = {
  aquarum:   '2026-05-17',
  compondus: '2026-05-25',
  loopa:     '2026-06-04',
  lumis:     '2026-05-15',
  numeris:   '2026-05-15',
  verba:     '2026-05-16',
}

export function getGamePuzzleNumber(game: string, date: string): number {
  const epoch = new Date((GAME_EPOCHS[game] ?? date) + 'T12:00:00')
  const d = new Date(date + 'T12:00:00')
  return Math.max(1, Math.round((d.getTime() - epoch.getTime()) / 86400000) + 1)
}
