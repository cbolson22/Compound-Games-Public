import type { AquarumPuzzle, PipeCell, PipeType } from '@/components/games/aquarum/useAquarum'

type Dir = 0 | 1 | 2 | 3
const DR = [-1, 0, 1, 0]
const DC = [0, 1, 0, -1]
const SIZE = 7

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}


function dirBetween(r1: number, c1: number, r2: number, c2: number): Dir {
  for (let d = 0; d < 4; d++) {
    if (r1 + DR[d] === r2 && c1 + DC[d] === c2) return d as Dir
  }
  throw new Error(`Not adjacent: (${r1},${c1})→(${r2},${c2})`)
}

function determinePipe(openDirs: Dir[]): { type: PipeType; rotation: number } {
  if (openDirs.length === 1) return { type: 'cap', rotation: openDirs[0] }
  const key = [...openDirs].sort((a, b) => a - b).join(',')
  const MAP: Record<string, { type: PipeType; rotation: number }> = {
    '0,2': { type: 'straight', rotation: 0 },
    '1,3': { type: 'straight', rotation: 1 },
    '0,1': { type: 'corner',   rotation: 0 },
    '1,2': { type: 'corner',   rotation: 1 },
    '2,3': { type: 'corner',   rotation: 2 },
    '0,3': { type: 'corner',   rotation: 3 },
  }
  return MAP[key] ?? { type: 'straight', rotation: 0 }
}

// Warnsdorff's heuristic: always move to the neighbor with fewest onward moves.
// Finds Hamiltonian paths on 7×7 grids very reliably with random tiebreaking.
function warnsdorffPath(): [number, number][] | null {
  const startR = randInt(0, SIZE - 1)
  const startC = randInt(0, SIZE - 1)

  const visited: boolean[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(false))
  const path: [number, number][] = [[startR, startC]]
  visited[startR][startC] = true

  while (path.length < SIZE * SIZE) {
    const [r, c] = path[path.length - 1]

    const candidates: { nr: number; nc: number; deg: number }[] = []
    for (const d of ([0, 1, 2, 3] as Dir[])) {
      const nr = r + DR[d], nc = c + DC[d]
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || visited[nr][nc]) continue

      // Degree = unvisited neighbors of (nr,nc). (r,c) is visited so it's excluded automatically.
      let deg = 0
      for (const d2 of ([0, 1, 2, 3] as Dir[])) {
        const r2 = nr + DR[d2], c2 = nc + DC[d2]
        if (r2 >= 0 && r2 < SIZE && c2 >= 0 && c2 < SIZE && !visited[r2][c2]) deg++
      }
      candidates.push({ nr, nc, deg })
    }

    if (!candidates.length) break

    // Sort by degree; shuffle within tied groups for variety
    candidates.sort((a, b) => a.deg - b.deg)
    const minDeg = candidates[0].deg
    const tied = candidates.filter(x => x.deg === minDeg)
    const chosen = tied[randInt(0, tied.length - 1)]

    visited[chosen.nr][chosen.nc] = true
    path.push([chosen.nr, chosen.nc])
  }

  return path.length === SIZE * SIZE ? path : null
}

function buildPath(fullPath: [number, number][], start: number, end: number, colorId: number, grid: PipeCell[]) {
  // Build pipe cells for fullPath[start..end] (inclusive), updating the flat grid array
  const sub = fullPath.slice(start, end + 1)
  for (let i = 0; i < sub.length; i++) {
    const [r, c] = sub[i]
    const openDirs: Dir[] = []
    if (i > 0)              openDirs.push(dirBetween(r, c, sub[i - 1][0], sub[i - 1][1]))
    if (i < sub.length - 1) openDirs.push(dirBetween(r, c, sub[i + 1][0], sub[i + 1][1]))
    const { type, rotation: solvedRotation } = determinePipe(openDirs)
    const isSource = i === 0
    const isSink   = i === sub.length - 1
    grid[r * SIZE + c] = { type, solvedRotation, fixed: isSource || isSink, colorId, isSource, isSink }
  }
}

const ALL_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b']
const MIN_PATH_LEN = 8

// Returns sorted split indices such that each segment has >= MIN_PATH_LEN cells.
// Segments are full[0..splits[0]], full[splits[0]+1..splits[1]], ..., full[splits[n-1]+1..end]
function randomSplits(total: number, numPaths: number): number[] | null {
  if (numPaths * MIN_PATH_LEN > total) return null

  // Start each path at its minimum length; distribute the remainder randomly
  const lengths = Array(numPaths).fill(MIN_PATH_LEN)
  let remaining = total - numPaths * MIN_PATH_LEN
  while (remaining > 0) {
    lengths[randInt(0, numPaths - 1)]++
    remaining--
  }

  // Convert lengths to end-indices (0-based, inclusive)
  const splits: number[] = []
  let cursor = 0
  for (let i = 0; i < numPaths - 1; i++) {
    cursor += lengths[i]
    splits.push(cursor - 1)
  }
  return splits
}

export function generateAquarum(): AquarumPuzzle {
  for (let attempt = 0; attempt < 500; attempt++) {
    const full = warnsdorffPath()
    if (!full) continue

    const numPaths = randInt(2, 4)
    const splits = randomSplits(SIZE * SIZE, numPaths)
    if (!splits) continue

    const colors = ALL_COLORS.slice(0, numPaths)
    const flatGrid: PipeCell[] = Array.from({ length: SIZE * SIZE }, (): PipeCell => ({
      type: 'empty', solvedRotation: 0, fixed: false, colorId: 0, isSource: false, isSink: false,
    }))

    // Build each path segment
    const starts = [0, ...splits.map(s => s + 1)]
    const ends   = [...splits, SIZE * SIZE - 1]
    for (let i = 0; i < numPaths; i++) {
      buildPath(full, starts[i], ends[i], i, flatGrid)
    }

    const grid: PipeCell[][] = Array.from({ length: SIZE }, (_, r) =>
      Array.from({ length: SIZE }, (_, c) => flatGrid[r * SIZE + c])
    )

    return { size: SIZE, grid, colors }
  }

  throw new Error('Failed to generate Aquarum puzzle')
}
