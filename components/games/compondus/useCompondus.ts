import { useState, useCallback, useMemo } from 'react'
import type { CompondusPuzzle } from '@/lib/puzzles/compondus'

export type CompondusSavedState = {
  wrongCount: number
  currentSlot: number
  solvedMask: boolean[]
  revealedCounts: number[]
}

export function useCompondus(puzzle: CompondusPuzzle, savedState?: CompondusSavedState) {
  const hidden = puzzle.chain.slice(1, -1)

  const [wrongCount, setWrongCount] = useState(savedState?.wrongCount ?? 0)
  const [currentSlot, setCurrentSlot] = useState(savedState?.currentSlot ?? 0)
  const [solvedMask, setSolvedMask] = useState<boolean[]>(
    () => savedState?.solvedMask ?? Array(hidden.length).fill(false)
  )
  const [revealedCounts, setRevealedCounts] = useState<number[]>(
    () => savedState?.revealedCounts ?? hidden.map((_, i) => i === 0 ? 1 : 0)
  )
  const [shakeSlot, setShakeSlot] = useState<number | null>(null)

  const solved = useMemo(() => solvedMask.every(Boolean), [solvedMask])

  // Returns true on correct guess, false on wrong/incomplete
  const submit = useCallback((typedLetters: string[]): boolean => {
    if (solved || currentSlot >= hidden.length) return false
    const target = hidden[currentSlot]
    const revealedPart = target.slice(0, revealedCounts[currentSlot])
    const fullGuess = revealedPart + typedLetters.join('')
    if (fullGuess.length < target.length) return false

    if (fullGuess === target) {
      const newSolvedMask = [...solvedMask]
      newSolvedMask[currentSlot] = true
      setSolvedMask(newSolvedMask)
      const next = currentSlot + 1
      setCurrentSlot(next)
      if (next < hidden.length) {
        const newRevealed = [...revealedCounts]
        newRevealed[next] = 1
        setRevealedCounts(newRevealed)
      }
      return true
    } else {
      setWrongCount(c => c + 1)
      const newRevealed = [...revealedCounts]
      if (newRevealed[currentSlot] < target.length - 1) {
        newRevealed[currentSlot]++
        setRevealedCounts(newRevealed)
      }
      setShakeSlot(currentSlot)
      setTimeout(() => setShakeSlot(null), 400)
      return false
    }
  }, [solved, currentSlot, hidden, solvedMask, revealedCounts])

  return {
    hidden,
    wrongCount,
    currentSlot,
    solvedMask,
    revealedCounts,
    submit,
    solved,
    shakeSlot,
  }
}
