'use client'

import { useState, useEffect, useRef } from 'react'
import posthog from 'posthog-js'
import { fmtTime } from '@/lib/format'
import { saveResult, saveArchiveResult, getResult, getArchiveResult, computeStreak } from '@/lib/localStorage'
import { saveScoreToSupabase } from '@/lib/supabaseScores'
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
  puzzleDate,
  puzzleNumber,
  isArchive = false,
}: {
  puzzle: AquarumPuzzle
  puzzleId: string | null
  puzzleDate: string
  puzzleNumber: number
  isArchive?: boolean
}) {
  const [{ savedResult, alreadyPlayed, streak }] = useState(() => {
    const result = getResult('aquarum', puzzleDate) ?? (isArchive ? getArchiveResult('aquarum', puzzleDate) : null)
    return {
      savedResult: result,
      alreadyPlayed: result !== null,
      streak: result !== null && !isArchive ? computeStreak('aquarum', puzzleDate) : 0,
    }
  })
  const solveSubmitted = useRef(false)
  const rotateCount = useRef(0)
  const storageKey = `aquarum-inprog-${puzzleDate}`

  const [{ savedElapsed, savedRotations }] = useState(() => {
    if (alreadyPlayed) return {
      savedElapsed: 0,
      savedRotations: savedResult?.solveData?.finalRotations as number[][] | undefined,
    }
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return { savedElapsed: 0, savedRotations: undefined }
      const parsed = JSON.parse(raw) as { elapsed: number; rotations: number[][] }
      const rotations = Array.isArray(parsed.rotations) &&
        parsed.rotations.length === puzzle.size &&
        Array.isArray(parsed.rotations[0]) &&
        parsed.rotations[0].length === puzzle.size
        ? parsed.rotations : undefined
      return { savedElapsed: parsed.elapsed ?? 0, savedRotations: rotations }
    } catch { return { savedElapsed: 0, savedRotations: undefined } }
  })

  const [copied, setCopied] = useState(false)

  const { rotations, elapsed, solved, solvedCells, rotateCell, reset } = useAquarum(puzzle, {
    initialElapsed: savedElapsed,
    paused: alreadyPlayed,
    savedRotations,
  })

  useEffect(() => {
    if (alreadyPlayed || solved) return
    localStorage.setItem(storageKey, JSON.stringify({ elapsed, rotations }))
  }, [elapsed, rotations, storageKey, alreadyPlayed, solved])

  useEffect(() => {
    if (!solved || alreadyPlayed || solveSubmitted.current) return
    solveSubmitted.current = true
    localStorage.removeItem(storageKey)
    const rotationCount = rotateCount.current
    const share = `Aquarum #${puzzleNumber}\n⏱ ${fmtTime(elapsed)} · 🔄 ${rotationCount} rotation${rotationCount !== 1 ? 's' : ''}\ncompound-games.com`
    const result = {
      time_seconds: elapsed,
      completed_at: new Date().toISOString(),
      share,
      solveData: { finalRotations: rotations },
    }
    const saveFn = isArchive ? saveArchiveResult : saveResult
    saveFn('aquarum', puzzleDate, result)
    saveScoreToSupabase('aquarum', puzzleDate, isArchive, result).catch(() => {})
    posthog.capture('aquarum_completed', {
      puzzle_number: puzzleNumber,
      puzzle_date: puzzleDate,
      time_seconds: elapsed,
      rotation_count: rotationCount,
      is_archive: isArchive,
    })
  }, [solved, elapsed, puzzleDate, puzzleNumber, storageKey, alreadyPlayed, isArchive, rotations])

  const displayTime = alreadyPlayed ? (savedResult?.time_seconds ?? 0) : elapsed
  const isDone = solved || alreadyPlayed
  const handleShare = () => {
    const shareText = alreadyPlayed
      ? savedResult?.share
      : (() => {
          const rotationCount = rotateCount.current
          return `Aquarum #${puzzleNumber}\n⏱ ${fmtTime(elapsed)} · 🔄 ${rotationCount} rotation${rotationCount !== 1 ? 's' : ''}\ncompound-games.com`
        })()
    navigator.clipboard.writeText(shareText ?? '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
    posthog.capture('aquarum_shared', {
      puzzle_number: puzzleNumber,
      puzzle_date: puzzleDate,
      is_archive: isArchive,
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
                onClick={canClick ? () => { rotateCount.current++; rotateCell(r, c) } : undefined}
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
