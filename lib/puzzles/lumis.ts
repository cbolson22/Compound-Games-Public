import type { LumisPuzzle, CellPos, PieceData } from '@/components/games/lumis/useLumis'

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

// All fixed-orientation piece shapes (no rotation in-game)
const SHAPE_LIBRARY: CellPos[][] = [
  // Dominoes
  [[0,0],[0,1]],
  [[0,0],[1,0]],
  // Trominoes
  [[0,0],[0,1],[0,2]],
  [[0,0],[1,0],[2,0]],
  [[0,0],[0,1],[1,0]],
  [[0,0],[0,1],[1,1]],
  [[0,0],[1,0],[1,1]],
  [[0,1],[1,0],[1,1]],
  // Tetrominoes (fixed orientations)
  [[0,0],[0,1],[1,0],[1,1]],         // square
  [[0,0],[0,1],[0,2],[1,1]],         // T down
  [[0,1],[1,0],[1,1],[2,1]],         // T right
  [[0,1],[1,0],[1,1],[1,2]],         // T up
  [[0,0],[1,0],[1,1],[2,0]],         // T left
  [[0,0],[1,0],[2,0],[2,1]],         // L right
  [[0,0],[0,1],[0,2],[1,0]],         // L top-right
  [[0,0],[0,1],[1,1],[2,1]],         // L left
  [[0,2],[1,0],[1,1],[1,2]],         // L top-left
  [[0,1],[1,1],[2,0],[2,1]],         // J right
  [[0,0],[1,0],[1,1],[1,2]],         // J bottom-left
  [[0,0],[0,1],[1,0],[2,0]],         // J left
  [[0,0],[0,1],[0,2],[1,2]],         // J top-right
  [[0,1],[0,2],[1,0],[1,1]],         // S horizontal
  [[0,0],[0,1],[1,1],[1,2]],         // Z horizontal
  [[0,0],[1,0],[1,1],[2,1]],         // S vertical
  [[0,1],[1,0],[1,1],[2,0]],         // Z vertical
]

const GRID = 7

function canFit(grid: boolean[][], shape: CellPos[], anchorR: number, anchorC: number): boolean {
  for (const [dr, dc] of shape) {
    const r = anchorR + dr, c = anchorC + dc
    if (r < 0 || r >= GRID || c < 0 || c >= GRID) return false
    if (grid[r][c]) return false
  }
  return true
}

function place(grid: boolean[][], shape: CellPos[], anchorR: number, anchorC: number): void {
  for (const [dr, dc] of shape) {
    grid[anchorR + dr][anchorC + dc] = true
  }
}

function tryBuildPuzzle(pieceCount: number): LumisPuzzle | null {
  const grid: boolean[][] = Array.from({ length: GRID }, () => Array(GRID).fill(false))
  const shapes = shuffle([...SHAPE_LIBRARY]).slice(0, pieceCount)
  const placed: { shape: CellPos[]; r: number; c: number }[] = []

  for (const shape of shapes) {
    // Try up to 200 random positions for this piece
    let success = false
    for (let attempt = 0; attempt < 200; attempt++) {
      const r = randInt(0, GRID - 1)
      const c = randInt(0, GRID - 1)
      if (canFit(grid, shape, r, c)) {
        place(grid, shape, r, c)
        placed.push({ shape, r, c })
        success = true
        break
      }
    }
    if (!success) return null
  }

  const target: CellPos[] = []
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if (grid[r][c]) target.push([r, c])

  const pieces: PieceData[] = placed.map((p, i) => ({ id: String(i), shape: p.shape }))

  return { target, pieces: shuffle(pieces) }
}

export function generateLumis(): LumisPuzzle {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const pieceCount = randInt(4, 6)
    const puzzle = tryBuildPuzzle(pieceCount)
    if (puzzle && puzzle.target.length >= 12 && puzzle.target.length <= 24) {
      return puzzle
    }
  }
  throw new Error('Failed to generate Lumis puzzle')
}
