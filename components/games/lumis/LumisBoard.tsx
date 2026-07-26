'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import posthog from 'posthog-js'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useDraggable, useDroppable, useSensor, useSensors,
  pointerWithin,
  type DragEndEvent, type DragStartEvent, type DragOverEvent,
} from '@dnd-kit/core'
import { useLumis, type LumisPuzzle, type CellPos, type PieceData, type PlacedPiece } from './useLumis'
import { fmtTime } from '@/lib/format'
import { saveResult, saveArchiveResult, getResult, getArchiveResult, computeStreak } from '@/lib/localStorage'
import styles from './lumis.module.css'

const PIECE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#14b8a6']

function PieceShape({ shape, color, cellSize = 40 }: { shape: CellPos[]; color: string; cellSize?: number }) {
  const maxR = Math.max(...shape.map(([r]) => r))
  const maxC = Math.max(...shape.map(([, c]) => c))
  const rows = maxR + 1, cols = maxC + 1
  const cellSet = new Set(shape.map(([r, c]) => `${r},${c}`))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`, gap: 3 }}>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <div
            key={`${r},${c}`}
            style={{
              width: cellSize,
              height: cellSize,
              background: cellSet.has(`${r},${c}`) ? color : 'transparent',
              borderRadius: 5,
            }}
          />
        ))
      )}
    </div>
  )
}

function BankPiece({ piece, color, selected, onSelect }: {
  piece: PieceData; color: string; selected: boolean; onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `piece-${piece.id}` })
  return (
    <div
      ref={setNodeRef}
      className={[styles.bankPiece, selected ? styles.bankPieceSelected : ''].filter(Boolean).join(' ')}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      onClick={onSelect}
      {...listeners}
      {...attributes}
    >
      <PieceShape shape={piece.shape} color={color} cellSize={32} />
    </div>
  )
}

function GridCell({
  r, c, pieceColor, isTarget, lightsOn, previewColor, previewValid, onReturn, onTapPlace,
}: {
  r: number; c: number
  pieceColor: string | null
  isTarget: boolean
  lightsOn: boolean
  previewColor: string | null
  previewValid: boolean
  onReturn?: () => void
  onTapPlace?: () => void
}) {
  const { setNodeRef } = useDroppable({ id: `cell-${r}-${c}` })

  let bg: string | undefined
  if (pieceColor) {
    bg = pieceColor
  } else if (previewColor) {
    bg = previewValid ? previewColor + 'aa' : '#ef444455'
  } else if (lightsOn && isTarget) {
    bg = '#fde68a'
  }

  const cursor = onTapPlace ? 'crosshair' : pieceColor ? 'pointer' : 'default'

  const handleClick = () => {
    if (onTapPlace) onTapPlace()
    else if (onReturn) onReturn()
  }

  return (
    <div
      ref={setNodeRef}
      className={[
        styles.cell,
        lightsOn && isTarget && !pieceColor ? styles.lit : '',
        pieceColor ? styles.occupied : '',
      ].filter(Boolean).join(' ')}
      style={{ background: bg, cursor, touchAction: 'manipulation' }}
      onClick={handleClick}
    />
  )
}

export default function LumisBoard({
  puzzle,
  puzzleDate,
  puzzleNumber,
  isArchive = false,
}: {
  puzzle: LumisPuzzle
  puzzleId: string | null
  puzzleDate: string
  puzzleNumber: number
  isArchive?: boolean
}) {
  const [{ savedResult, alreadyPlayed, streak }] = useState(() => {
    const result = getResult('lumis', puzzleDate) ?? (isArchive ? getArchiveResult('lumis', puzzleDate) : null)
    return {
      savedResult: result,
      alreadyPlayed: result !== null,
      streak: result !== null && !isArchive ? computeStreak('lumis', puzzleDate) : 0,
    }
  })
  const solveSubmitted = useRef(false)
  const firstColors = useRef<string[]>([])
  const resetCount = useRef(0)
  const computedShare = useRef('')
  const storageKey = `lumis-inprog-${puzzleDate}`

  const [{ initialElapsed, initialPlaced }] = useState(() => {
    if (alreadyPlayed) return {
      initialElapsed: 0,
      initialPlaced: savedResult?.solveData?.placed as PlacedPiece[] | undefined,
    }
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return { initialElapsed: 0, initialPlaced: undefined }
      const parsed = JSON.parse(raw)
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          initialElapsed: parsed.elapsed ?? 0,
          initialPlaced: Array.isArray(parsed.placed) ? (parsed.placed as PlacedPiece[]) : undefined,
        }
      }
      return { initialElapsed: parseInt(raw, 10) || 0, initialPlaced: undefined }
    } catch {
      return { initialElapsed: 0, initialPlaced: undefined }
    }
  })

  const [copied, setCopied] = useState(false)

  const {
    placed, lightsOn, elapsed, solved,
    bankPieces, occupiedGrid, targetSet,
    canPlace, placePiece, returnPiece, onPickup, reset,
  } = useLumis(puzzle, { initialElapsed, paused: alreadyPlayed, initialPlaced })

  useEffect(() => {
    if (solved || alreadyPlayed) return
    localStorage.setItem(storageKey, JSON.stringify({ elapsed, placed }))
  }, [elapsed, placed, storageKey, solved, alreadyPlayed])

  useEffect(() => {
    if (!solved || alreadyPlayed || solveSubmitted.current) return
    solveSubmitted.current = true
    localStorage.removeItem(storageKey)
    const PIECE_EMOJIS = ['🟡', '🔵', '🟢', '🟣', '🔴', '🩵']
    const colorEmojis = firstColors.current
      .slice(0, 3)
      .map(pid => {
        const idx = puzzle.pieces.findIndex(p => p.id === pid)
        return PIECE_EMOJIS[idx % PIECE_EMOJIS.length]
      })
      .join(' ')
    const resets = resetCount.current
    const share = `Lumis #${puzzleNumber}\nFirst pieces placed: ${colorEmojis}\n⏱ ${fmtTime(elapsed)} · ${resets} reset${resets !== 1 ? 's' : ''}\ncompound-games.com`
    computedShare.current = share
    const saveFn = isArchive ? saveArchiveResult : saveResult
    saveFn('lumis', puzzleDate, {
      time_seconds: elapsed,
      completed_at: new Date().toISOString(),
      share,
      solveData: { placed },
    })
    posthog.capture('lumis_completed', {
      puzzle_number: puzzleNumber,
      puzzle_date: puzzleDate,
      time_seconds: elapsed,
      reset_count: resetCount.current,
      is_archive: isArchive,
    })
  }, [solved, elapsed, puzzleDate, puzzleNumber, puzzle.pieces, storageKey, alreadyPlayed, isArchive, placed])

  const [activeId, setActiveId] = useState<string | null>(null)
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null)
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null)

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {}
    puzzle.pieces.forEach((p, i) => { map[p.id] = PIECE_COLORS[i % PIECE_COLORS.length] })
    return map
  }, [puzzle.pieces])

  const activePieceId = activeId ? activeId.slice(6) : null
  const activePiece = activePieceId ? puzzle.pieces.find(p => p.id === activePieceId) ?? null : null

  const preview = useMemo(() => {
    if (!activePieceId || !hoveredCell) return null
    const piece = puzzle.pieces.find(p => p.id === activePieceId)
    if (!piece) return null
    const [anchorR, anchorC] = hoveredCell
    const valid = canPlace(activePieceId, anchorR, anchorC)
    const cells = new Set(
      piece.shape
        .map(([dr, dc]): [number, number] => [anchorR + dr, anchorC + dc])
        .filter(([r, c]) => r >= 0 && r < 7 && c >= 0 && c < 7)
        .map(([r, c]) => `${r},${c}`)
    )
    return { cells, valid, color: colorMap[activePieceId] }
  }, [activePieceId, hoveredCell, puzzle.pieces, canPlace, colorMap])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const trackPlace = useCallback((pieceId: string, r: number, c: number): boolean => {
    const success = placePiece(pieceId, r, c)
    if (success && firstColors.current.length < 3) {
      firstColors.current = [...firstColors.current, pieceId]
    }
    return success
  }, [placePiece])

  const handleTapSelect = useCallback((pieceId: string) => {
    setSelectedPieceId(prev => prev === pieceId ? null : pieceId)
    onPickup()
  }, [onPickup])

  const handleTapPlace = useCallback((r: number, c: number) => {
    if (!selectedPieceId) return
    const success = trackPlace(selectedPieceId, r, c)
    if (success) setSelectedPieceId(null)
  }, [selectedPieceId, trackPlace])

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(active.id as string)
    setSelectedPieceId(null)
    onPickup()
  }, [onPickup])

  const handleDragOver = useCallback(({ over }: DragOverEvent) => {
    if (!over) { setHoveredCell(null); return }
    const id = over.id as string
    if (id.startsWith('cell-')) {
      const parts = id.split('-')
      setHoveredCell([parseInt(parts[1]), parseInt(parts[2])])
    } else {
      setHoveredCell(null)
    }
  }, [])

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveId(null)
    setHoveredCell(null)
    if (!over) return
    const overId = over.id as string
    if (!overId.startsWith('cell-')) return
    const pieceId = (active.id as string).slice(6)
    const parts = overId.split('-')
    trackPlace(pieceId, parseInt(parts[1]), parseInt(parts[2]))
  }, [trackPlace])

  const handleReset = useCallback(() => {
    setSelectedPieceId(null)
    resetCount.current++
    firstColors.current = []
    reset()
  }, [reset])

  const displayTime = alreadyPlayed ? (savedResult?.time_seconds ?? 0) : elapsed
  const isDone = solved || alreadyPlayed
  const handleShare = () => {
    const shareText = alreadyPlayed ? savedResult?.share : computedShare.current
    navigator.clipboard.writeText(shareText ?? '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
    posthog.capture('lumis_shared', {
      puzzle_number: puzzleNumber,
      puzzle_date: puzzleDate,
      is_archive: isArchive,
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.board}>
        <div className={styles.title}>Lumis</div>
        <div className={styles.sub}>Puzzle #{puzzleNumber}</div>

        <div className={styles.timerWrap}>
          <div className={styles.timerLbl}>Time</div>
          <div className={[styles.timer, isDone ? styles.timerSolved : ''].filter(Boolean).join(' ')}>
            {fmtTime(displayTime)}
          </div>
        </div>

        <div className={styles.mainLayout}>
          <div className={styles.leftCol}>
            <div className={styles.grid}>
              {Array.from({ length: 7 }, (_, r) =>
                Array.from({ length: 7 }, (_, c) => {
                  const key = `${r},${c}`
                  const pieceId = occupiedGrid[r][c]
                  const isPreview = preview?.cells.has(key) ?? false
                  return (
                    <GridCell
                      key={key}
                      r={r} c={c}
                      pieceColor={pieceId ? colorMap[pieceId] : null}
                      isTarget={targetSet.has(key)}
                      lightsOn={lightsOn}
                      previewColor={isPreview ? preview!.color : null}
                      previewValid={preview?.valid ?? false}
                      onReturn={pieceId && !isDone ? () => returnPiece(pieceId) : undefined}
                      onTapPlace={selectedPieceId && !isDone ? () => handleTapPlace(r, c) : undefined}
                    />
                  )
                })
              )}
            </div>
          </div>

          <div className={[styles.rightCol, isDone ? styles.rightColSolved : ''].filter(Boolean).join(' ')}>
            {!isDone && (
              <div className={styles.bankWrap}>
                <div className={styles.bankLbl}>Pieces</div>
                <div className={styles.bank}>
                  {bankPieces.map(p => (
                    <BankPiece
                      key={p.id}
                      piece={p}
                      color={colorMap[p.id]}
                      selected={selectedPieceId === p.id}
                      onSelect={() => handleTapSelect(p.id)}
                    />
                  ))}
                  {bankPieces.length === 0 && (
                    <span className={styles.bankEmpty}>All pieces placed</span>
                  )}
                </div>
              </div>
            )}

            {!isDone && (
              <div className={styles.hint}>
                {lightsOn
                  ? 'Memorize the pattern, then drag or tap a piece to start.'
                  : selectedPieceId
                    ? 'Tap a cell to place the selected piece.'
                    : 'Tap a piece to select it, or drag to place.'}
              </div>
            )}

            {isDone && (
              <div className={styles.solvedBanner}>
                <div className={styles.solvedTxt}>Solved!</div>
                <div className={styles.solvedSub}>Completed in {fmtTime(displayTime)}</div>
                {streak > 0 && <div className={styles.solvedSub}>{streak}🔥</div>}
                <button
                  onClick={handleShare}
                  className="mt-3 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1a1a] text-white hover:bg-[#333] transition-colors"
                >
                  {copied ? 'Copied!' : 'Share result'}
                </button>
              </div>
            )}
          </div>
        </div>

        {!isDone && (
          <button className={styles.resetBtn} onClick={handleReset}>
            {lightsOn ? 'Reset' : 'Reset & Show Pattern'}
          </button>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activePiece
          ? <PieceShape shape={activePiece.shape} color={colorMap[activePiece.id]} cellSize={52} />
          : null}
      </DragOverlay>
    </DndContext>
  )
}
