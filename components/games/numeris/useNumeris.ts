import { useState, useEffect, useCallback, useMemo } from 'react'
import { safeEvalExpr } from '@/lib/math'

export interface TileData {
  val: string
  id: number
}

export interface Puzzle {
  target: number
  tiles: string[]
  slots: number
}

const OPS = ['+', '−', '×', '÷']

// Each tile must be exactly one of these characters — enforced before any eval
const VALID_TILE = /^[0-9+\-−×÷()^]$/

export function isSym(v: string): boolean {
  return OPS.includes(v) || v === '(' || v === ')' || v === '^'
}

function evalSlots(slotContents: (string | null)[]): number | null {
  for (const v of slotContents) {
    if (v !== null && !VALID_TILE.test(v)) return null
  }
  let expr = ''
  let i = 0
  while (i < slotContents.length) {
    const v = slotContents[i]
    if (v === null) { i++; continue }
    if (!isSym(v)) {
      let run = ''
      while (i < slotContents.length && slotContents[i] !== null && !isSym(slotContents[i]!)) {
        run += slotContents[i]
        i++
      }
      expr += parseInt(run, 10)
    } else if (v === '^') {
      expr += '**'
      i++
    } else if (OPS.includes(v)) {
      expr += v === '×' ? '*' : v === '÷' ? '/' : v === '−' ? '-' : v
      i++
    } else {
      expr += v
      i++
    }
  }
  if (!expr) return null
  if (/^[+*/]/.test(expr) || /[+\-*/]$/.test(expr)) return null
  if (/\([+\-*/]/.test(expr) || /[+\-*/]\)/.test(expr)) return null
  const r = safeEvalExpr(expr)
  return r !== null && isFinite(r) ? Math.round(r * 1e9) / 1e9 : null
}

export function useNumeris(
  puzzle: Puzzle,
  { initialElapsed = 0, paused = false, initialSlots }: {
    initialElapsed?: number
    paused?: boolean
    initialSlots?: (string | null)[]
  } = {}
) {
  const tiles = useMemo<TileData[]>(
    () => puzzle.tiles.map((val, id) => ({ val, id })),
    [puzzle.tiles]
  )

  const [slotContents, setSlotContents] = useState<(string | null)[]>(
    () => initialSlots ?? Array(puzzle.slots).fill(null)
  )
  const [elapsed, setElapsed] = useState(initialElapsed)

  const solved =
    slotContents.every(s => s !== null) &&
    evalSlots(slotContents) === puzzle.target

  useEffect(() => {
    if (solved || paused) return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [solved, paused])

  const usedIndices = useMemo<Set<number>>(() => {
    const used: number[] = []
    slotContents.forEach(v => {
      if (v !== null) {
        const idx = tiles.findIndex((t, i) => t.val === v && !used.includes(i))
        if (idx !== -1) used.push(idx)
      }
    })
    return new Set(used)
  }, [tiles, slotContents])

  const placeTile = useCallback((tileId: number, slotIndex: number) => {
    const tile = tiles.find(t => t.id === tileId)
    if (!tile) return
    setSlotContents(prev => {
      const next = [...prev]
      next[slotIndex] = tile.val
      return next
    })
  }, [tiles])

  const swapSlots = useCallback((fromSlot: number, toSlot: number) => {
    setSlotContents(prev => {
      const next = [...prev]
      ;[next[fromSlot], next[toSlot]] = [next[toSlot], next[fromSlot]]
      return next
    })
  }, [])

  const returnSlot = useCallback((slotIndex: number) => {
    setSlotContents(prev => {
      const next = [...prev]
      next[slotIndex] = null
      return next
    })
  }, [])

  const clearBoard = useCallback(() => {
    setSlotContents(prev => {
      if (evalSlots(prev) === puzzle.target && prev.every(s => s !== null)) return prev
      return Array(puzzle.slots).fill(null)
    })
  }, [puzzle.slots, puzzle.target])

  const resetBoard = useCallback((contents: (string | null)[]) => {
    setSlotContents(contents)
  }, [])

  const currentResult = evalSlots(slotContents)
  const allFilled = slotContents.every(s => s !== null)

  return {
    tiles,
    slotContents,
    usedIndices,
    solved,
    elapsed,
    currentResult,
    allFilled,
    target: puzzle.target,
    placeTile,
    swapSlots,
    returnSlot,
    clearBoard,
    resetBoard,
  }
}
