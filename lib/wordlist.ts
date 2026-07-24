let wordSet: Set<string> | null = null

export async function getWordSet(): Promise<Set<string>> {
  if (wordSet) return wordSet
  const res = await fetch('/words.txt')
  const text = await res.text()
  wordSet = new Set(
    text.split('\n')
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length >= 3)
  )
  return wordSet
}

export function isWord(w: string, set: Set<string>): boolean {
  return set.has(w.toUpperCase())
}
