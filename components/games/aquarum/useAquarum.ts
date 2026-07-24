import { useState, useEffect, useMemo, useCallback } from 'react'

export type PipeType = 'straight' | 'corner' | 'cap' | 'empty'

export interface PipeCell {
  type: PipeType
  solvedRotation: number
  fixed: boolean
  colorId: number
  isSource: boolean
  isSink: boolean
}

export interface AquarumPuzzle {
  size: number
  grid: PipeCell[][]
  colors: string[]
}

type Dir = 0 | 1 | 2 | 3
const DR = [-1, 0, 1, 0]
const DC = [0, 1, 0, -1]
const OPP: Dir[] = [2, 3, 0, 1]

const BASE_OPEN: Record<PipeType, Dir[]> = {
  cap:      [0],
  straight: [0, 2],
  corner:   [0, 1],
  empty:    [],
}

export function getOpenSides(type: PipeType, rotation: number): Dir[] {
  return BASE_OPEN[type].map(d => ((d + rotation) % 4) as Dir)
}

function computeSolveState(puzzle: AquarumPuzzle, rotations: number[][]): {
  solved: boolean
  solvedCells: Set<string>
} {
  const { size, grid } = puzzle

  const sources: { r: number; c: number; colorId: number }[] = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c].isSource) sources.push({ r, c, colorId: grid[r][c].colorId })

  if (!sources.length) return { solved: false, solvedCells: new Set() }

  const solvedCells = new Set<string>()

  for (const src of sources) {
    const queue: [number, number][] = [[src.r, src.c]]
    const component = new Set([`${src.r},${src.c}`])
    let valid = true
    let foundSink = false

    bfs:
    while (queue.length > 0) {
      const [r, c] = queue.shift()!
      const cell = grid[r][c]

      if (cell.isSink && !(r === src.r && c === src.c)) {
        if (cell.colorId !== src.colorId) { valid = false; break }
        foundSink = true
        continue
      }

      for (const d of getOpenSides(cell.type, rotations[r][c])) {
        const nr = r + DR[d], nc = c + DC[d]
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) { valid = false; break bfs }
        const nKey = `${nr},${nc}`
        if (component.has(nKey)) continue
        if (!getOpenSides(grid[nr][nc].type, rotations[nr][nc]).includes(OPP[d])) { valid = false; break bfs }
        component.add(nKey)
        queue.push([nr, nc])
      }
    }

    if (valid && foundSink) component.forEach(k => solvedCells.add(k))
  }

  let solved = true
  outer:
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c].type !== 'empty' && !solvedCells.has(`${r},${c}`)) { solved = false; break outer }

  return { solved, solvedCells }
}

function initRotations(grid: PipeCell[][]): number[][] {
  return grid.map(row =>
    row.map(cell => {
      if (cell.fixed || cell.type === 'empty') return cell.solvedRotation
      return (cell.solvedRotation + Math.floor(Math.random() * 3) + 1) % 4
    })
  )
}

export function useAquarum(
  puzzle: AquarumPuzzle,
  options?: { initialElapsed?: number; paused?: boolean; savedRotations?: number[][] }
) {
  const paused = options?.paused ?? false

  const [rotations, setRotations] = useState<number[][]>(() =>
    options?.savedRotations ?? initRotations(puzzle.grid)
  )
  const [elapsed, setElapsed] = useState(options?.initialElapsed ?? 0)

  const { solved, solvedCells } = useMemo(() => computeSolveState(puzzle, rotations), [puzzle, rotations])

  useEffect(() => {
    if (solved || paused) return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [solved, paused])

  const rotateCell = useCallback((r: number, c: number) => {
    const cell = puzzle.grid[r][c]
    if (cell.fixed || cell.type === 'empty' || solved) return
    setRotations(prev => {
      const next = prev.map(row => [...row])
      next[r][c] = (prev[r][c] + 1) % 4
      return next
    })
  }, [puzzle.grid, solved])

  const reset = useCallback(() => {
    setRotations(initRotations(puzzle.grid))
  }, [puzzle.grid])

  const restoreRotations = useCallback((saved: number[][]) => {
    setRotations(saved)
  }, [])

  return { rotations, elapsed, solved, solvedCells, rotateCell, reset, restoreRotations }
}
