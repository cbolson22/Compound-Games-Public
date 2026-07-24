import { useState, useEffect, useMemo, useCallback } from 'react'

export type CellPos = [number, number]
export type PieceData = { id: string; shape: CellPos[] }
export type PlacedPiece = { pieceId: string; anchorR: number; anchorC: number }
export type LumisPuzzle = { target: CellPos[]; pieces: PieceData[] }

const GRID = 7

export function useLumis(puzzle: LumisPuzzle, options?: { initialElapsed?: number; paused?: boolean; initialPlaced?: PlacedPiece[] }) {
  const [placed, setPlaced] = useState<PlacedPiece[]>(options?.initialPlaced ?? [])
  const [lightsOn, setLightsOn] = useState(!options?.initialPlaced?.length)
  const [elapsed, setElapsed] = useState(options?.initialElapsed ?? 0)

  const bankPieces = useMemo(() => {
    const placedIds = new Set(placed.map(p => p.pieceId))
    return puzzle.pieces.filter(p => !placedIds.has(p.id))
  }, [placed, puzzle.pieces])

  const occupiedGrid = useMemo(() => {
    const g: (string | null)[][] = Array.from({ length: GRID }, () => Array(GRID).fill(null))
    for (const p of placed) {
      const piece = puzzle.pieces.find(x => x.id === p.pieceId)!
      for (const [dr, dc] of piece.shape) {
        const r = p.anchorR + dr, c = p.anchorC + dc
        if (r >= 0 && r < GRID && c >= 0 && c < GRID) g[r][c] = p.pieceId
      }
    }
    return g
  }, [placed, puzzle.pieces])

  const targetSet = useMemo(
    () => new Set(puzzle.target.map(([r, c]) => `${r},${c}`)),
    [puzzle.target]
  )

  const solved = useMemo(() => {
    if (bankPieces.length > 0) return false
    const allCovered = puzzle.target.every(([r, c]) => occupiedGrid[r][c] !== null)
    const noExtra = placed.every(p => {
      const piece = puzzle.pieces.find(x => x.id === p.pieceId)!
      return piece.shape.every(([dr, dc]) => targetSet.has(`${p.anchorR + dr},${p.anchorC + dc}`))
    })
    return allCovered && noExtra
  }, [bankPieces, puzzle, occupiedGrid, placed, targetSet])

  useEffect(() => {
    if (solved || options?.paused) return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [solved, options?.paused])

  const canPlace = useCallback((pieceId: string, anchorR: number, anchorC: number): boolean => {
    const piece = puzzle.pieces.find(p => p.id === pieceId)
    if (!piece) return false
    for (const [dr, dc] of piece.shape) {
      const r = anchorR + dr, c = anchorC + dc
      if (r < 0 || r >= GRID || c < 0 || c >= GRID) return false
      if (occupiedGrid[r][c] !== null) return false
    }
    return true
  }, [puzzle.pieces, occupiedGrid])

  const placePiece = useCallback((pieceId: string, anchorR: number, anchorC: number): boolean => {
    if (!canPlace(pieceId, anchorR, anchorC)) return false
    setPlaced(prev => [...prev, { pieceId, anchorR, anchorC }])
    return true
  }, [canPlace])

  const returnPiece = useCallback((pieceId: string) => {
    setPlaced(prev => prev.filter(p => p.pieceId !== pieceId))
  }, [])

  const onPickup = useCallback(() => {
    setLightsOn(false)
  }, [])

  const reset = useCallback(() => {
    setPlaced([])
    setLightsOn(true)
  }, [])

  const restorePlaced = useCallback((restored: PlacedPiece[]) => {
    setPlaced(restored)
    setLightsOn(false)
  }, [])

  return {
    placed, lightsOn, elapsed, solved,
    bankPieces, occupiedGrid, targetSet,
    canPlace, placePiece, returnPiece, onPickup, reset, restorePlaced,
  }
}
