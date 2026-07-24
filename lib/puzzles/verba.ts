export type VerbaPuzzle = {
  columns: number
  letters: string[]
}

// Weighted by Scrabble tile frequency for natural letter distribution
const LETTER_BAG = (
  'AAAAAAAAABBCCDDDDEEEEEEEEEEEEFFGGGHHIIIIIIIIIJ' +
  'KLLLLMMNNNNNNOOOOOOOOPPQRRRRRRSSSSTTTTTTUUUUVVWWXYYZ'
).split('')

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateVerba(): VerbaPuzzle {
  const columns = randInt(4, 7)
  const count = randInt(15, 20)

  const letters: string[] = []
  for (let i = 0; i < count; i++) {
    letters.push(pick(LETTER_BAG))
  }

  // Ensure at least 4 vowels so the puzzle is playable
  const vowels = 'AEIOU'.split('')
  const vowelCount = letters.filter(l => vowels.includes(l)).length
  for (let i = vowelCount; i < 4; i++) {
    const idx = letters.findIndex(l => !vowels.includes(l))
    if (idx !== -1) letters[idx] = pick(vowels)
  }

  // Q is unplayable without U — guarantee a U is present whenever Q is drawn
  if (letters.includes('Q') && !letters.includes('U')) {
    const idx = letters.findIndex(l => !vowels.includes(l) && l !== 'Q')
    if (idx !== -1) letters[idx] = 'U'
    else letters[letters.indexOf('Q')] = 'U' // fallback: swap Q itself if no consonant available
  }

  return { columns, letters: shuffle(letters) }
}
