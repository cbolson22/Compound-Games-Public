'use client'

import { useState, useEffect, useRef } from 'react'
import { fmtTime } from '@/lib/format'
import { saveResult, getResult, computeStreak } from '@/lib/localStorage'
import { useAquarum, getOpenSides, type AquarumPuzzle, type PipeCell } from './useAquarum'
import styles from './aquarum.module.css'

const ARM: Record<number, [number, number, number, number]> = {
  0: [16, 0,  12, 22],
  1: [22, 16, 22, 12],
  2: [16, 22, 12, 22],
  3: [0,  16, 22, 12],
}

const FILL_TRANSITION = { transition: 'fill 0.5s ease' }

function PipeSvg({ cell, rotation, color }: { cell: PipeCell; rotation: number; color: string }) {
  const openSides = getOpenSides(cell.type, rotation)
  return (
    <svg viewBox="0 0 44 44" width="100%" height="100%" style={{ display: 'block' }}>
      {openSides.map(d => {
        const [x, y, w, h] = ARM[d]
        return <rect key={d} x={x} y={y} width={w} height={h} rx={3} fill={color} style={FILL_TRANSITION} />
      })}
      <circle cx={22} cy={22} r={7} fill={color} style={FILL_TRANSITION} />
      {cell.isSource && <circle cx={22} cy={22} r={3} fill="#fff" />}
      {cell.isSink && <circle cx={22} cy={22} r={3} fill="none" stroke="#fff" strokeWidth={1.5} />}
    </svg>
  )
}

export default function AquarumBoard({
  puzzle,
  puzzleId,
  puzzleDate,
  puzzleNumber,
}: {
  puzzle: AquarumPuzzle
  puzzleId: string | null
  puzzleDate: string
  puzzleNumber: number
}) {
  const [{ savedResult, alreadyPlayed, streak }] = useState(() => {
    const result = getResult('aquarum', puzzleDate)
    return {
      savedResult: result,
      alreadyPlayed: result !== null,
      streak: result !== null ? computeStreak('aquarum', puzzleDate) : 0,
    }
  })
  const solveSubmitted = useRef(false)
  const storageKey = puzzleId ? `aquarum-${puzzleId}` : null

  const [savedElapsed] = useState(() => {
    if (alreadyPlayed || !storageKey) return 0
    return parseInt(localStorage.getItem(`${storageKey}-elapsed`) || '0', 10)
  })

  const [savedRotations] = useState<number[][] | undefined>(() => {
    if (alreadyPlayed || !storageKey) return undefined
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return undefined
      const parsed = JSON.parse(raw) as number[][]
      if (
        !Array.isArray(parsed) ||
        parsed.length !== puzzle.size ||
        !Array.isArray(parsed[0]) ||
        parsed[0].length !== puzzle.size
      ) {
        localStorage.removeItem(storageKey)
        return undefined
      }
      return parsed
    } catch { return undefined }
  })

  const [copied, setCopied] = useState(false)

  const { rotations, elapsed, solved, solvedCells, rotateCell, reset } = useAquarum(puzzle, {
    initialElapsed: savedElapsed,
    paused: alreadyPlayed,
    savedRotations,
  })

  useEffect(() => {
    if (!storageKey || alreadyPlayed || solved) return
    localStorage.setItem(`${storageKey}-elapsed`, String(elapsed))
  }, [elapsed, storageKey, alreadyPlayed, solved])

  useEffect(() => {
    if (!storageKey || alreadyPlayed || solved) return
    localStorage.setItem(storageKey, JSON.stringify(rotations))
  }, [rotations, storageKey, alreadyPlayed, solved])

  useEffect(() => {
    if (!solved || alreadyPlayed || solveSubmitted.current) return
    solveSubmitted.current = true
    if (storageKey) {
      localStorage.removeItem(storageKey)
      localStorage.removeItem(`${storageKey}-elapsed`)
    }
    const share = `Compound Games – Aquarum #${puzzleNumber}\n⏱ ${fmtTime(elapsed)}\ncompound-games.com`
    saveResult('aquarum', puzzleDate, {
      time_seconds: elapsed,
      score: null,
      completed_at: new Date().toISOString(),
      share,
    })
  }, [solved, elapsed, puzzleDate, puzzleNumber, storageKey, alreadyPlayed])

  const displayTime = alreadyPlayed ? (savedResult?.time_seconds ?? 0) : elapsed
  const isDone = solved || alreadyPlayed
  const shareText = alreadyPlayed
    ? savedResult?.share
    : `Compound Games – Aquarum #${puzzleNumber}\n⏱ ${fmtTime(elapsed)}\ncompound-games.com`

  const handleShare = () => {
    navigator.clipboard.writeText(shareText ?? '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className={styles.board}>
      <div className={styles.title}>Aquarum</div>
      <div className={styles.sub}>Puzzle #{puzzleNumber}</div>

      <div className={styles.timerWrap}>
        <div className={styles.timerLbl}>Time</div>
        <div className={[styles.timer, isDone ? styles.timerSolved : ''].filter(Boolean).join(' ')}>
          {fmtTime(displayTime)}
        </div>
      </div>

      <div className={styles.grid}>
        {puzzle.grid.map((row, r) =>
          row.map((cell, c) => {
            const color =
              cell.type === 'empty'
                ? 'transparent'
                : isDone || cell.fixed || solvedCells.has(`${r},${c}`)
                  ? puzzle.colors[cell.colorId]
                  : '#9ca3af'

            const canClick = !cell.fixed && cell.type !== 'empty' && !isDone

            return (
              <div
                key={`${r},${c}`}
                className={[
                  styles.cell,
                  cell.type !== 'empty' ? styles.pipedCell : '',
                  cell.fixed ? styles.fixedCell : '',
                  canClick ? styles.clickable : '',
                ].filter(Boolean).join(' ')}
                onClick={canClick ? () => rotateCell(r, c) : undefined}
              >
                {cell.type !== 'empty' && (
                  <PipeSvg cell={cell} rotation={rotations[r][c]} color={color} />
                )}
              </div>
            )
          })
        )}
      </div>

      {!isDone && (
        <>
          <div className={styles.hint}>
            Click the gray pipes to rotate them and connect each path.
          </div>
          <button className={styles.resetBtn} onClick={reset}>Reset</button>
        </>
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
  )
}
