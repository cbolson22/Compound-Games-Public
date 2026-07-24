export const LETTER_VALUES: Record<string, number> = {
  A:1, B:3, C:3, D:2, E:1, F:4, G:2, H:4, I:1, J:8, K:5, L:1,
  M:3, N:1, O:1, P:3, Q:10, R:1, S:1, T:1, U:2, V:4, W:4, X:8,
  Y:4, Z:10,
}

export function scoreWord(word: string): number {
  const base = [...word].reduce((sum, l) => sum + (LETTER_VALUES[l] ?? 1), 0)
  const mult = word.length >= 5 ? 2 : word.length === 4 ? 1.5 : word.length === 3 ? 1 : 0.5
  return Math.round(base * mult)
}
