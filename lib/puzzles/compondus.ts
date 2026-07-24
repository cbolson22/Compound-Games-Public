import fs from 'fs'
import path from 'path'

export type CompondusPuzzle = {
  chain: string[]  // Uppercase words; first and last are shown, middle are hidden
}

const PAIRS: [string, string][] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'public/compounds.json'), 'utf8')
).pairs

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateCompondus(excludeWords: string[] = []): CompondusPuzzle {
  const pairs = PAIRS

  const graph = new Map<string, string[]>()
  for (const [a, b] of pairs) {
    if (!graph.has(a)) graph.set(a, [])
    graph.get(a)!.push(b)
  }

  const excludeSet = new Set(excludeWords.map(w => w.toLowerCase()))

  function tryGenerate(useExclusions: boolean): CompondusPuzzle | null {
    const startCandidates = [...graph.keys()].filter(w => !useExclusions || !excludeSet.has(w))

    for (let attempt = 0; attempt < 2000; attempt++) {
      const targetLen = 5 + Math.floor(Math.random() * 3)  // 5, 6, or 7 words total
      const start = pick(startCandidates)
      const chain = [start]
      const inChain = new Set([start])
      let ok = true

      for (let i = 1; i < targetLen; i++) {
        const isLast = i === targetLen - 1
        const raw = (graph.get(chain[chain.length - 1]) ?? [])
          .filter(w => (!useExclusions || !excludeSet.has(w)) && !inChain.has(w))
        // For non-last steps, require the next word to also have outgoing edges
        const candidates = isLast ? raw : raw.filter(w => (graph.get(w)?.length ?? 0) > 0)
        if (candidates.length === 0) { ok = false; break }
        const next = pick(candidates)
        chain.push(next)
        inChain.add(next)
      }

      if (ok && chain.length === targetLen) {
        return { chain: chain.map(w => w.toUpperCase()) }
      }
    }
    return null
  }

  return (
    tryGenerate(true) ??
    tryGenerate(false) ??
    { chain: ['FIRE', 'TRUCK', 'LOAD', 'STAR', 'FISH'].map(w => w.toUpperCase()) }
  )
}
