'use client'

import { useState, useEffect, useRef } from 'react'
import { fmtTime } from '@/lib/format'
import { saveResult, saveArchiveResult, getResult, getArchiveResult, computeStreak } from '@/lib/localStorage'
import { useLoopa, hKey, vKey, cellEdgeCount, type EdgeKey } from './useLoopa'
import type { LoopaPuzzle } from '@/lib/puzzles/loopa'
import styles from './loopa.module.css'

const N = 5

const CLUE_COLORS: Record<number, string> = {
  1: '#60a5fa',
  2: '#34d399',
  3: '#a855f7',
}

const CLUE_BG: Record<number, string> = {
  1: '#dbeafe',
  2: '#d1fae5',
  3: '#f3e8ff',
}

const EDGE_ACTIVE = '#6366f1'
const EDGE_HOVER = '#a5b4fc'
const DOT_DEFAULT = '#94a3b8'
const DOT_ACTIVE = '#6366f1'

export default function LoopaBoard({
  puzzle,
  puzzleId,
  puzzleDate,
  puzzleNumber,
  isArchive = false,
}: {
  puzzle: LoopaPuzzle
  puzzleId: string | null
  puzzleDate: string
  puzzleNumber: number
  isArchive?: boolean
}) {
  const [{ savedResult, alreadyPlayed, streak }] = useState(() => {
    const result = getResult('loopa', puzzleDate) ?? (isArchive ? getArchiveResult('loopa', puzzleDate) : null)
    return {
      savedResult: result,
      alreadyPlayed: result !== null,
      streak: result !== null && !isArchive ? computeStreak('loopa', puzzleDate) : 0,
    }
  })
  const solveSubmitted = useRef(false)
  const storageKey = `loopa-inprog-${puzzleDate}`

  const [{ savedElapsed, savedEdges }] = useState(() => {
    if (alreadyPlayed) return {
      savedElapsed: 0,
      savedEdges: savedResult?.solveData?.edges as string[] | undefined,
    }
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return { savedElapsed: 0, savedEdges: undefined }
      const parsed = JSON.parse(raw) as { elapsed: number; edges: string[] }
      const edges = Array.isArray(parsed.edges) ? parsed.edges : undefined
      return { savedElapsed: parsed.elapsed ?? 0, savedEdges: edges }
    } catch { return { savedElapsed: 0, savedEdges: undefined } }
  })

  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState<EdgeKey | null>(null)
  const [viewportWidth, setViewportWidth] = useState(600)

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const { edges, elapsed, solved, litDots, toggleEdge, reset } = useLoopa(puzzle, {
    initialElapsed: savedElapsed,
    paused: alreadyPlayed,
    savedEdges,
  })

  useEffect(() => {
    if (alreadyPlayed || solved) return
    localStorage.setItem(storageKey, JSON.stringify({ elapsed, edges: [...edges] }))
  }, [elapsed, edges, storageKey, alreadyPlayed, solved])

  useEffect(() => {
    if (!solved || alreadyPlayed || solveSubmitted.current) return
    solveSubmitted.current = true
    localStorage.removeItem(storageKey)
    const share = `Loopa #${puzzleNumber}\n⏱ ${fmtTime(elapsed)}\ncompound-games.com`
    const saveFn = isArchive ? saveArchiveResult : saveResult
    saveFn('loopa', puzzleDate, {
      time_seconds: elapsed,
      completed_at: new Date().toISOString(),
      share,
      solveData: { edges: [...edges] },
    })
  }, [solved, elapsed, puzzleDate, puzzleNumber, storageKey, alreadyPlayed])

  const displayTime = alreadyPlayed ? (savedResult?.time_seconds ?? 0) : elapsed
  const isDone = solved || alreadyPlayed
  const shareText = alreadyPlayed
    ? savedResult?.share
    : `Loopa #${puzzleNumber}\n⏱ ${fmtTime(elapsed)}\ncompound-games.com`

  const handleShare = () => {
    navigator.clipboard.writeText(shareText ?? '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const edgeSize = Math.max(20, Math.min(36, Math.floor((Math.min(viewportWidth, 480) - 32) / 16)))
  const cellSize = edgeSize * 2

  const gridTemplate = Array.from({ length: 2 * N + 1 }, (_, i) =>
    i % 2 === 0 ? `${edgeSize}px` : `${cellSize}px`,
  ).join(' ')

  return (
    <div className={styles.board}>
      <div className={styles.title}>Loopa</div>
      <div className={styles.sub}>Puzzle #{puzzleNumber}</div>

      <div className={styles.timerWrap}>
        <div className={styles.timerLbl}>Time</div>
        <div className={[styles.timer, isDone ? styles.timerSolved : ''].filter(Boolean).join(' ')}>
          {fmtTime(displayTime)}
        </div>
      </div>

      <div className={styles.gridLayout}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: gridTemplate,
            gridTemplateRows: gridTemplate,
            userSelect: 'none',
            background: '#f8fafc',
            borderRadius: 16,
            padding: 12,
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          }}
        >
          {Array.from({ length: (2 * N + 1) ** 2 }, (_, idx) => {
            const vi = Math.floor(idx / (2 * N + 1))
            const vj = idx % (2 * N + 1)
            const rEven = vi % 2 === 0
            const cEven = vj % 2 === 0

            if (rEven && cEven) {
              const dr = vi / 2, dc = vj / 2
              const lit = litDots.has(`${dr},${dc}`)
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: lit ? edgeSize * 0.42 : edgeSize * 0.32,
                    height: lit ? edgeSize * 0.42 : edgeSize * 0.32,
                    borderRadius: '50%',
                    background: lit ? DOT_ACTIVE : DOT_DEFAULT,
                    transition: 'all 0.15s',
                  }} />
                </div>
              )
            }

            if (rEven && !cEven) {
              const r = vi / 2, c = (vj - 1) / 2
              const key = hKey(r, c)
              const active = edges.has(key)
              const hover = hovered === key
              const canInteract = !isDone
              return (
                <button
                  key={idx}
                  onClick={canInteract ? () => toggleEdge(key) : undefined}
                  onMouseEnter={canInteract ? () => setHovered(key) : undefined}
                  onMouseLeave={canInteract ? () => setHovered(null) : undefined}
                  style={{
                    background: hover && !active ? '#eef2ff' : 'transparent',
                    border: 'none',
                    cursor: canInteract ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    borderRadius: 99,
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{
                    width: '100%',
                    height: active ? 6 : hover ? 5 : 3,
                    borderRadius: 99,
                    background: 'transparent',
                    backgroundImage: active
                      ? `linear-gradient(${EDGE_ACTIVE}, ${EDGE_ACTIVE})`
                      : hover
                        ? `linear-gradient(${EDGE_HOVER}, ${EDGE_HOVER})`
                        : 'repeating-linear-gradient(to right, #c7d2fe 0, #c7d2fe 5px, transparent 5px, transparent 10px)',
                    boxShadow: active ? `0 0 8px ${EDGE_ACTIVE}88` : 'none',
                    transition: 'all 0.1s',
                  }} />
                </button>
              )
            }

            if (!rEven && cEven) {
              const r = (vi - 1) / 2, c = vj / 2
              const key = vKey(r, c)
              const active = edges.has(key)
              const hover = hovered === key
              const canInteract = !isDone
              return (
                <button
                  key={idx}
                  onClick={canInteract ? () => toggleEdge(key) : undefined}
                  onMouseEnter={canInteract ? () => setHovered(key) : undefined}
                  onMouseLeave={canInteract ? () => setHovered(null) : undefined}
                  style={{
                    background: hover && !active ? '#eef2ff' : 'transparent',
                    border: 'none',
                    cursor: canInteract ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 0',
                    borderRadius: 99,
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{
                    height: '100%',
                    width: active ? 6 : hover ? 5 : 3,
                    borderRadius: 99,
                    background: 'transparent',
                    backgroundImage: active
                      ? `linear-gradient(${EDGE_ACTIVE}, ${EDGE_ACTIVE})`
                      : hover
                        ? `linear-gradient(${EDGE_HOVER}, ${EDGE_HOVER})`
                        : 'repeating-linear-gradient(to bottom, #c7d2fe 0, #c7d2fe 5px, transparent 5px, transparent 10px)',
                    boxShadow: active ? `0 0 8px ${EDGE_ACTIVE}88` : 'none',
                    transition: 'all 0.1s',
                  }} />
                </button>
              )
            }

            const r = (vi - 1) / 2, c = (vj - 1) / 2
            const clue = puzzle.clues[r][c]
            const count = cellEdgeCount(edges, r, c)
            const over = count > clue
            const done = count === clue && clue > 0

            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: cellSize * 0.55,
                  height: cellSize * 0.55,
                  borderRadius: cellSize * 0.14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: `${Math.max(11, cellSize * 0.32)}px`,
                  fontWeight: 700,
                  background: over ? '#fee2e2' : done ? CLUE_BG[clue] : 'transparent',
                  color: over ? '#ef4444' : CLUE_COLORS[clue] ?? '#94a3b8',
                  opacity: over ? 1 : done ? 1 : 0.3,
                  boxShadow: done ? `0 0 0 2px ${CLUE_COLORS[clue]}55` : 'none',
                  transform: done ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.2s',
                }}>
                  {clue}
                </div>
              </div>
            )
          })}
        </div>

        {isDone && (
          <div className={styles.solvedBanner}>
            <div className={styles.solvedTxt}>Loop complete!</div>
            <div className={styles.solvedSub}>{fmtTime(displayTime)}</div>
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

      {!isDone && (
        <button className={styles.resetBtn} onClick={reset}>
          Reset board
        </button>
      )}
    </div>
  )
}
