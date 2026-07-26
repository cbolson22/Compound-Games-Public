'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import posthog from 'posthog-js'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useDraggable, useDroppable, useSensor, useSensors,
  pointerWithin,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { useVerba, MAX_COL_HEIGHT, WORD_COLORS, type VerbaSavedState } from './useVerba'
import type { VerbaPuzzle } from '@/lib/puzzles/verba'
import { LETTER_VALUES } from '@/lib/scoring'
import { fmtTime } from '@/lib/format'
import { saveResult, saveArchiveResult, getResult, getArchiveResult, computeStreak } from '@/lib/localStorage'
import { saveScoreToSupabase } from '@/lib/supabaseScores'
import styles from './verba.module.css'

function DraggableTile({ tileId, letter, available, selected, onSelect }: {
  tileId: number
  letter: string
  available: boolean
  selected: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tile-${tileId}`,
    disabled: !available,
  })
  return (
    <div
      ref={setNodeRef}
      className={[
        styles.bankTile,
        !available ? styles.bankTileUsed : selected ? styles.bankTileSelected : '',
      ].filter(Boolean).join(' ')}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      onClick={available ? onSelect : undefined}
      {...listeners}
      {...attributes}
    >
      {letter}
      <span className={styles.tileValue}>{LETTER_VALUES[letter] ?? 1}</span>
    </div>
  )
}

function Column({ colIdx, letters, highlightedCells, canPlaceHere, onTap }: {
  colIdx: number
  letters: string[]
  highlightedCells: Map<string, number>
  canPlaceHere: boolean
  onTap: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${colIdx}` })

  return (
    <div
      ref={setNodeRef}
      className={[styles.column, isOver && canPlaceHere ? styles.columnOver : ''].filter(Boolean).join(' ')}
      onClick={onTap}
    >
      {Array.from({ length: MAX_COL_HEIGHT }, (_, visualRow) => {
        const dataRow = MAX_COL_HEIGHT - 1 - visualRow
        const letter = letters[dataRow]
        const wordIdx = letter ? highlightedCells.get(`${colIdx},${dataRow}`) : undefined
        const color = wordIdx !== undefined ? WORD_COLORS[wordIdx % WORD_COLORS.length] : null
        return (
          <div
            key={visualRow}
            className={[styles.cell, letter ? styles.cellFilled : ''].filter(Boolean).join(' ')}
            style={color ? {
              background: color.bg,
              borderColor: color.border,
              color: color.text,
              boxShadow: `0 0 10px ${color.glow}`,
            } : {}}
          >
            {letter}
            {letter && <span className={styles.tileValue}>{LETTER_VALUES[letter] ?? 1}</span>}
          </div>
        )
      })}
    </div>
  )
}

export default function VerbaBoard({
  puzzle,
  puzzleDate,
  puzzleNumber,
  isArchive = false,
}: {
  puzzle: VerbaPuzzle
  puzzleId: string | null
  puzzleDate: string
  puzzleNumber: number
  isArchive?: boolean
}) {
  const [{ savedResult, alreadyPlayed, streak }] = useState(() => {
    const result = getResult('verba', puzzleDate) ?? (isArchive ? getArchiveResult('verba', puzzleDate) : null)
    return {
      savedResult: result,
      alreadyPlayed: result !== null,
      streak: result !== null && !isArchive ? computeStreak('verba', puzzleDate) : 0,
    }
  })
  const solveSubmitted = useRef(false)
  const storageKey = `verba-inprog-${puzzleDate}`

  const [savedState] = useState<VerbaSavedState | undefined>(() => {
    if (alreadyPlayed) {
      const savedGrid = savedResult?.solveData?.grid as string[][] | undefined
      return savedGrid ? { timeLeft: 0, grid: savedGrid, history: [] } as VerbaSavedState : undefined
    }
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : undefined
    } catch { return undefined }
  })

  const [copied, setCopied] = useState(false)

  const {
    grid, bank, history, timeLeft, gameOver,
    detectedWords, totalScore, highlightedCells,
    canPlace, placeTile, removeTopTile, undo,
  } = useVerba(puzzle, savedState)

  const [selectedTileId, setSelectedTileId] = useState<number | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const allTiles = useMemo(
    () => puzzle.letters.map((letter, i) => ({ id: i, letter })),
    [puzzle]
  )
  const availableIds = useMemo(() => new Set(bank.map(t => t.id)), [bank])

  // Save score when timer hits zero
  useEffect(() => {
    if (!gameOver || alreadyPlayed || solveSubmitted.current) return
    solveSubmitted.current = true
    localStorage.removeItem(storageKey)
    const WORD_EMOJIS = ['🟡', '🔵', '🟣', '🩵', '🩷', '🟢']
    const wordLine = detectedWords
      .map((w, i) => `${WORD_EMOJIS[i % WORD_EMOJIS.length]} +${w.score}`)
      .join(' · ')
    const share = `Verba #${puzzleNumber}\n📊 ${totalScore} pts${wordLine ? `\n${wordLine}` : ''}\ncompound-games.com`
    const result = {
      score: totalScore,
      completed_at: new Date().toISOString(),
      share,
      solveData: { words: detectedWords.map(w => ({ word: w.word, score: w.score })), grid },
    }
    const saveFn = isArchive ? saveArchiveResult : saveResult
    saveFn('verba', puzzleDate, result)
    saveScoreToSupabase('verba', puzzleDate, isArchive, result).catch(() => {})
    posthog.capture('verba_completed', {
      puzzle_number: puzzleNumber,
      puzzle_date: puzzleDate,
      score: totalScore,
      word_count: detectedWords.length,
      is_archive: isArchive,
    })
  }, [gameOver, totalScore, detectedWords, puzzleDate, puzzleNumber, storageKey, alreadyPlayed, isArchive, grid])

  // Persist in-progress state
  useEffect(() => {
    if (alreadyPlayed) return
    if (gameOver) { localStorage.removeItem(storageKey); return }
    localStorage.setItem(storageKey, JSON.stringify({ timeLeft, grid, history } as VerbaSavedState))
  }, [storageKey, timeLeft, grid, history, gameOver, alreadyPlayed])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const handleColumnTap = useCallback((colIdx: number) => {
    if (gameOver || alreadyPlayed) return
    if (selectedTileId !== null) {
      placeTile(selectedTileId, colIdx)
      setSelectedTileId(null)
    } else {
      removeTopTile(colIdx)
    }
  }, [gameOver, alreadyPlayed, selectedTileId, placeTile, removeTopTile])

  const handleTileSelect = useCallback((tileId: number) => {
    setSelectedTileId(prev => prev === tileId ? null : tileId)
  }, [])

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(active.id as string)
    setSelectedTileId(null)
  }, [])

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over) return
    const overId = over.id as string
    if (!overId.startsWith('col-')) return
    const tileId = parseInt((active.id as string).slice(5))
    const colIdx = parseInt(overId.slice(4))
    placeTile(tileId, colIdx)
  }, [placeTile])

  const activeTileId = activeId ? parseInt(activeId.slice(5)) : null
  const activeLetter = activeTileId !== null ? (allTiles.find(t => t.id === activeTileId)?.letter ?? null) : null
  const isLow = timeLeft <= 10 && !gameOver
  const played = gameOver || alreadyPlayed
  const displayScore = alreadyPlayed ? (savedResult?.score ?? 0) : totalScore
  const shareText = alreadyPlayed
    ? savedResult?.share
    : (() => {
        const WORD_EMOJIS = ['🟡', '🔵', '🟣', '🩵', '🩷', '🟢']
        const wordLine = detectedWords
          .map((w, i) => `${WORD_EMOJIS[i % WORD_EMOJIS.length]} +${w.score}`)
          .join(' · ')
        return `Verba #${puzzleNumber}\n📊 ${totalScore} pts${wordLine ? `\n${wordLine}` : ''}\ncompound-games.com`
      })()

  const handleShare = () => {
    navigator.clipboard.writeText(shareText ?? '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
    posthog.capture('verba_shared', {
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
      onDragEnd={handleDragEnd}
    >
      <div className={styles.board}>
        <div className={styles.title}>Verba</div>
        <div className={styles.sub}>Puzzle #{puzzleNumber}</div>

        {!played && (
          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <div className={styles.statLbl}>Time</div>
              <div className={[styles.timer, isLow ? styles.timerLow : ''].filter(Boolean).join(' ')}>
                {fmtTime(timeLeft)}
              </div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statLbl}>Score</div>
              <div className={styles.scoreDisplay}>{totalScore}</div>
            </div>
          </div>
        )}

        <div className={styles.mainLayout}>
          <div className={styles.leftCol}>
            <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${puzzle.columns}, 44px)` }}>
              {Array.from({ length: puzzle.columns }, (_, colIdx) => (
                <Column
                  key={colIdx}
                  colIdx={colIdx}
                  letters={grid[colIdx]}
                  highlightedCells={highlightedCells}
                  canPlaceHere={canPlace(colIdx)}
                  onTap={() => handleColumnTap(colIdx)}
                />
              ))}
            </div>
          </div>

          <div className={styles.rightCol}>
            {played && (
              <div className={styles.solvedBanner}>
                <div className={styles.solvedTxt}>{alreadyPlayed ? 'Completed!' : "Time's Up!"}</div>
                <div className={styles.solvedPts}>{displayScore}</div>
                <div className={styles.solvedPtsLabel}>pts</div>
                {streak > 0 && <div className={styles.solvedSub}>{streak}🔥</div>}
                <button
                  onClick={handleShare}
                  className="mt-3 mb-6 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1a1a] text-white hover:bg-[#333] transition-colors"
                >
                  {copied ? 'Copied!' : 'Share result'}
                </button>
              </div>
            )}

            {!played && (
              <div className={styles.bankWrap}>
                <div className={styles.bankLbl}>Letters</div>
                <div className={styles.bank}>
                  {allTiles.map(tile => (
                    <DraggableTile
                      key={tile.id}
                      tileId={tile.id}
                      letter={tile.letter}
                      available={availableIds.has(tile.id)}
                      selected={selectedTileId === tile.id}
                      onSelect={() => handleTileSelect(tile.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {detectedWords.length > 0 && (
              <div className={styles.wordList}>
                <div className={styles.wordListLbl}>Words Found</div>
                <div className={styles.words}>
                  {detectedWords.map((w, i) => {
                    const color = WORD_COLORS[i % WORD_COLORS.length]
                    return (
                      <span
                        key={i}
                        className={styles.wordChip}
                        style={{ borderColor: color.border, background: color.bg, color: color.text }}
                      >
                        {w.word.toLowerCase()}&nbsp;<span className={styles.wordScore} style={{ color: color.border }}>+{w.score}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {!played && (
              <div className={styles.hint}>
                {selectedTileId !== null
                  ? `Tap a column to place ${allTiles.find(t => t.id === selectedTileId)?.letter ?? ''}`
                  : 'Tap a tile to select, or drag to a column'}
              </div>
            )}
          </div>
        </div>

        {!played && (
          <button className={styles.undoBtn} onClick={undo}>
            ↩ Undo
          </button>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLetter ? (
          <div className={styles.bankTile}>
            {activeLetter}
            <span className={styles.tileValue}>{LETTER_VALUES[activeLetter] ?? 1}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
