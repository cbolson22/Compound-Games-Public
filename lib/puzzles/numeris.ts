import type { Puzzle } from '@/components/games/numeris/useNumeris'
import { safeEvalExpr } from '@/lib/math'

const ADD_SUB = ['+', '−']

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function toTokens(n: number): string[] {
  return String(n).split('')
}

function toJS(tokens: string[]): string {
  return tokens.join('')
    .replace(/−/g, '-')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\^/g, '**')
}

function evalTokens(tokens: string[]): number | null {
  const r = safeEvalExpr(toJS(tokens))
  return r !== null && Number.isInteger(r) && isFinite(r) && r >= 10 && r <= 500 ? r : null
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const TEMPLATES: Array<() => string[] | null> = [
  // (A op B) × C
  () => {
    const a = randInt(1, 9), b = randInt(1, 9), c = randInt(2, 9)
    return ['(', ...toTokens(a), pick(ADD_SUB), ...toTokens(b), ')', '×', ...toTokens(c)]
  },
  // A × (B op C)
  () => {
    const a = randInt(2, 9), b = randInt(1, 9), c = randInt(1, 9)
    return [...toTokens(a), '×', '(', ...toTokens(b), pick(ADD_SUB), ...toTokens(c), ')']
  },
  // (A op B) ^ C
  () => {
    const a = randInt(1, 9), b = randInt(1, 9), c = randInt(2, 3)
    return ['(', ...toTokens(a), pick(ADD_SUB), ...toTokens(b), ')', '^', ...toTokens(c)]
  },
  // AB × C  (two-digit times single)
  () => {
    const a = randInt(10, 25), b = randInt(2, 9)
    return [...toTokens(a), '×', ...toTokens(b)]
  },
  // A × B + C
  () => {
    const a = randInt(2, 9), b = randInt(2, 9), c = randInt(1, 9)
    return [...toTokens(a), '×', ...toTokens(b), pick(ADD_SUB), ...toTokens(c)]
  },
  // A × B − C  (explicit subtraction variant)
  () => {
    const a = randInt(2, 9), b = randInt(2, 9), c = randInt(1, 9)
    return [...toTokens(a), '×', ...toTokens(b), '−', ...toTokens(c)]
  },
  // (A op B) × (C op D)
  () => {
    const a = randInt(1, 9), b = randInt(1, 9), c = randInt(1, 9), d = randInt(1, 9)
    return [
      '(', ...toTokens(a), pick(ADD_SUB), ...toTokens(b), ')',
      '×',
      '(', ...toTokens(c), pick(ADD_SUB), ...toTokens(d), ')',
    ]
  },
  // AB ÷ C + D  (two-digit divided then added)
  () => {
    const c = randInt(2, 9), d = randInt(1, 9)
    const ab = randInt(2, 9) * c  // ensure clean division
    if (ab > 99) return null
    return [...toTokens(ab), '÷', ...toTokens(c), pick(ADD_SUB), ...toTokens(d)]
  },
  // A × B op CD  (multi-digit result)
  () => {
    const a = randInt(2, 9), b = randInt(2, 9)
    const cd = randInt(10, 30)
    return [...toTokens(a), '×', ...toTokens(b), pick(ADD_SUB), ...toTokens(cd)]
  },
]

export function generateNumeris(): Puzzle {
  for (let i = 0; i < 10000; i++) {
    const tokens = pick(TEMPLATES)()
    if (!tokens || tokens.length < 5 || tokens.length > 8) continue

    const target = evalTokens(tokens)
    if (target === null) continue

    const tiles = shuffle(tokens)
    return { target, tiles, slots: tiles.length }
  }
  throw new Error('Failed to generate Numeris puzzle')
}
