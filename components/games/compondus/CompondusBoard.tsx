'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useCompondus, type CompondusSavedState } from './useCompondus'
import type { CompondusPuzzle } from '@/lib/puzzles/compondus'
import { saveResult, saveArchiveResult, getResult, getArchiveResult } from '@/lib/localStorage'
import styles from './compondus.module.css'

function AnchorRow({ word, position }: { word: string; position: 'start' | 'end' }) {
  return (
    <div className={`${styles.anchorRow} ${position === 'end' ? styles.anchorRowEnd : ''}`}>
      <div className={styles.boxes}>
        {word.split('').map((letter, i) => (
          <div key={i} className={`${styles.box} ${styles.boxAnchor}`}>{letter}</div>
        ))}
      </div>
    </div>
  )
}

function HiddenRow({
  word, isSolved, isActive, isShaking, revealedCount, typedLetters,
}: {
  word: string
  isSolved: boolean
  isActive: boolean
  isShaking: boolean
  revealedCount: number
  typedLetters: string[]
}) {
  const rowClass = [
    styles.hiddenRow,
    isActive ? styles.hiddenRowActive : '',
    isSolved ? styles.hiddenRowSolved : '',
    isShaking ? styles.shake : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={rowClass}>
      <div className={styles.boxes}>
        {word.split('').map((letter, i) => {
          const isRevealed = isSolved || i < revealedCount
          const typedIdx = i - revealedCount
          const isTyped = !isSolved && !isRevealed && typedIdx >= 0 && typedIdx < typedLetters.length
          const displayLetter = isRevealed ? letter : isTyped ? typedLetters[typedIdx] : ''

          let boxClass = styles.box
          if (isSolved)        boxClass += ` ${styles.boxSolved}`
          else if (isRevealed) boxClass += ` ${styles.boxRevealed}`
          else if (isTyped)    boxClass += ` ${styles.boxTyped}`
          else if (isActive)   boxClass += ` ${styles.boxEmpty}`
          else                 boxClass += ` ${styles.boxLocked}`

          return (
            <div key={i} className={boxClass}>{displayLetter}</div>
          )
        })}
      </div>
    </div>
  )
}

export default function CompondusBoard({
  puzzle,
  puzzleId,
  puzzleDate,
  puzzleNumber,
  isArchive = false,
}: {
  puzzle: CompondusPuzzle
  puzzleId: string | null
  puzzleDate: string
  puzzleNumber: number
  isArchive?: boolean
}) {
  const [{ savedResult, alreadyPlayed }] = useState(() => {
    const result = getResult('compondus', puzzleDate) ?? (isArchive ? getArchiveResult('compondus', puzzleDate) : null)
    return { savedResult: result, alreadyPlayed: result !== null }
  })
  const solveSubmitted = useRef(false)
  const startTimeRef = useRef(Date.now())
  const perSlotWrong = useRef<number[]>(Array(puzzle.chain.length - 2).fill(0))

  const [typedLetters, setTypedLetters] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const storageKey = puzzleId ? `compondus-${puzzleId}` : null

  const [savedState] = useState<CompondusSavedState | undefined>(() => {
    if (alreadyPlayed || !storageKey) return undefined
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : undefined
    } catch { return undefined }
  })

  const {
    hidden, wrongCount, currentSlot, solvedMask, revealedCounts,
    submit, solved, shakeSlot,
  } = useCompondus(puzzle, alreadyPlayed ? undefined : savedState)

  useEffect(() => {
    if (!alreadyPlayed) {
      setTimeout(() => hiddenInputRef.current?.focus(), 100)
    }
  }, [alreadyPlayed])

  useEffect(() => {
    setTypedLetters([])
    if (hiddenInputRef.current) hiddenInputRef.current.value = ''
    if (!solved && !alreadyPlayed) {
      setTimeout(() => hiddenInputRef.current?.focus(), 50)
    }
  }, [currentSlot, wrongCount]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(() => {
    const target = hidden[currentSlot]
    const fullGuess = target.slice(0, revealedCounts[currentSlot] ?? 0) + typedLetters.join('')
    const correct = submit(typedLetters)
    if (!correct && fullGuess.length >= target.length) {
      perSlotWrong.current[currentSlot] = (perSlotWrong.current[currentSlot] ?? 0) + 1
    }
  }, [submit, typedLetters, currentSlot, hidden, revealedCounts])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (solved || alreadyPlayed) return
    const target = hidden[currentSlot]
    const maxLen = target.length - (revealedCounts[currentSlot] ?? 0)
    const filtered = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, maxLen)
    setTypedLetters(filtered.split('').filter(Boolean))
    if (e.target.value !== filtered) e.target.value = filtered
  }, [solved, alreadyPlayed, hidden, currentSlot, revealedCounts])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  useEffect(() => {
    if (!solved || alreadyPlayed || solveSubmitted.current) return
    solveSubmitted.current = true
    if (storageKey) localStorage.removeItem(storageKey)
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000)
    const NUM_EMOJIS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣']
    const slotEmojis = perSlotWrong.current.map(wrong => {
      if (wrong === 0) return '✅'
      if (wrong > 9) return '➕'
      return NUM_EMOJIS[wrong - 1]
    }).join(' ')
    const share = `Compondus #${puzzleNumber}\n${slotEmojis}\n🎯 ${wrongCount} wrong guess${wrongCount !== 1 ? 'es' : ''}\ncompound-games.com`
    const saveFn = isArchive ? saveArchiveResult : saveResult
    saveFn('compondus', puzzleDate, {
      time_seconds: timeTaken,
      score: wrongCount,
      completed_at: new Date().toISOString(),
      share,
      solveData: { perSlotWrong: [...perSlotWrong.current] },
    })
  }, [solved, wrongCount, revealedCounts, puzzleDate, puzzleNumber, storageKey, alreadyPlayed])

  useEffect(() => {
    if (!storageKey || alreadyPlayed || solved) return
    localStorage.setItem(storageKey, JSON.stringify({ wrongCount, currentSlot, solvedMask, revealedCounts }))
  }, [storageKey, wrongCount, currentSlot, solvedMask, revealedCounts, solved, alreadyPlayed])

  useEffect(() => {
    if ((solved || alreadyPlayed) && storageKey) localStorage.removeItem(storageKey)
  }, [solved, alreadyPlayed, storageKey])

  const played = solved || alreadyPlayed
  const displayScore = alreadyPlayed ? (savedResult?.score ?? 0) : wrongCount
  const displaySolvedMask = played ? Array(hidden.length).fill(true) : solvedMask
  const displayRevealedCounts = played ? hidden.map(w => w.length) : revealedCounts
  const shareText = alreadyPlayed
    ? savedResult?.share
    : (() => {
        const NUM_EMOJIS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣']
        const slotEmojis = perSlotWrong.current.map(wrong => {
          if (wrong === 0) return '✅'
          if (wrong > 9) return '➕'
          return NUM_EMOJIS[wrong - 1]
        }).join(' ')
        return `Compondus #${puzzleNumber}\n${slotEmojis}\n🎯 ${wrongCount} wrong guess${wrongCount !== 1 ? 'es' : ''}\ncompound-games.com`
      })()

  const handleShare = () => {
    navigator.clipboard.writeText(shareText ?? '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className={styles.board}>
      <input
        ref={hiddenInputRef}
        className={styles.hiddenInput}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-hidden="true"
        tabIndex={played ? -1 : 0}
      />

      <div className={styles.title}>Compondus</div>
      <div className={styles.sub}>Puzzle #{puzzleNumber}</div>

      <div className={styles.statsRow}>
        {displayScore > 0
          ? <span className={styles.wrongBadge}>{displayScore} wrong guess{displayScore !== 1 ? 'es' : ''}</span>
          : <span className={styles.perfectBadge}>{played ? 'No wrong guesses' : 'Perfect so far'}</span>
        }
      </div>

      <div className={styles.ladder} onClick={() => !played ? hiddenInputRef.current?.focus() : undefined}>
        <AnchorRow word={puzzle.chain[0]} position="start" />

        {hidden.map((word, i) => (
          <React.Fragment key={i}>
            <div className={styles.connector}>↓</div>
            <HiddenRow
              word={word}
              isSolved={displaySolvedMask[i]}
              isActive={!played && i === currentSlot}
              isShaking={shakeSlot === i}
              revealedCount={displayRevealedCounts[i]}
              typedLetters={!played && i === currentSlot ? typedLetters : []}
            />
          </React.Fragment>
        ))}

        <div className={styles.connector}>↓</div>
        <AnchorRow word={puzzle.chain[puzzle.chain.length - 1]} position="end" />
      </div>

      {!played && (
        <p className={styles.hint}>Type a word · press Enter to submit</p>
      )}

      {played && (
        <button
          onClick={handleShare}
          className="mt-4 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1a1a] text-white hover:bg-[#333] transition-colors"
        >
          {copied ? 'Copied!' : 'Share result'}
        </button>
      )}
    </div>
  )
}
