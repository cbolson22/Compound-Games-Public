import { useState, useEffect, useMemo, useCallback } from "react";
import { isWord, getWordSet } from "@/lib/wordlist";
import { scoreWord } from "@/lib/scoring";
import type { VerbaPuzzle } from "@/lib/puzzles/verba";

export const MAX_COL_HEIGHT = 6;
export const GAME_DURATION = 60;

export const WORD_COLORS = [
  { bg: "#fef3c7", border: "#f59e0b", glow: "#fde68a", text: "#78350f" },
  { bg: "#dbeafe", border: "#60a5fa", glow: "#bfdbfe", text: "#1e3a8a" },
  { bg: "#f3e8ff", border: "#a855f7", glow: "#d8b4fe", text: "#581c87" },
  { bg: "#ccfbf1", border: "#2dd4bf", glow: "#99f6e4", text: "#134e4a" },
  { bg: "#ffe4e6", border: "#fb7185", glow: "#fecdd3", text: "#9f1239" },
  { bg: "#ecfccb", border: "#86efac", glow: "#bbf7d0", text: "#14532d" },
];

type BankTile = { id: number; letter: string };
export type DetectedWord = {
  word: string;
  direction: "h" | "v";
  startCol: number;
  startRow: number; // row 0 = bottom of grid
  score: number;
};

// grid[colIdx] = letters from bottom (index 0) to top
export type Grid = string[][];

export type VerbaSavedState = {
  timeLeft: number;
  grid: Grid;
  history: { tileId: number; colIdx: number }[];
};

export function computeDetectedWords(
  grid: Grid,
  columns: number,
  wordSet: Set<string>,
): DetectedWord[] {
  const found: DetectedWord[] = [];
  const maxHeight = Math.max(...grid.map((col) => col.length), 0);

  // Horizontal: scan each row level across all columns
  for (let r = 0; r < maxHeight; r++) {
    let runStart = -1;
    let run = "";

    const flush = () => {
      if (run.length < 2) {
        run = "";
        runStart = -1;
        return;
      }
      for (let s = 0; s < run.length; s++) {
        for (let e = s + 2; e <= run.length; e++) {
          const w = run.slice(s, e);
          if (isWord(w, wordSet)) {
            found.push({
              word: w,
              direction: "h",
              startCol: runStart + s,
              startRow: r,
              score: scoreWord(w),
            });
          }
        }
      }
      run = "";
      runStart = -1;
    };

    for (let c = 0; c < columns; c++) {
      const letter = grid[c]?.[r];
      if (letter) {
        if (run === "") runStart = c;
        run += letter;
      } else {
        flush();
      }
    }
    flush();
  }

  // Vertical: scan each column top-to-bottom
  for (let c = 0; c < columns; c++) {
    const col = grid[c];
    if (!col || col.length < 2) continue;
    const run = [...col].reverse().join(""); // reverse so index 0 = top (highest data row)
    for (let s = 0; s < run.length; s++) {
      for (let e = s + 2; e <= run.length; e++) {
        const w = run.slice(s, e);
        if (isWord(w, wordSet)) {
          found.push({
            word: w,
            direction: "v",
            startCol: c,
            startRow: col.length - 1 - s,
            score: scoreWord(w),
          });
        }
      }
    }
  }

  // Deduplicate by position + word
  const seen = new Set<string>();
  const deduped = found.filter((w) => {
    const key = `${w.direction}-${w.startCol}-${w.startRow}-${w.word}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Greedy overlap filter: sort longest-first, keep a word only if none of its cells
  // are already claimed by a kept word in the same direction.
  // H and V words can share cells freely (crossword-style).
  const occupiedH = new Set<string>();
  const occupiedV = new Set<string>();
  const result: DetectedWord[] = [];

  const sorted = [...deduped].sort(
    (a, b) => b.word.length - a.word.length || b.score - a.score,
  );
  for (const w of sorted) {
    const cells: string[] = [];
    if (w.direction === "h") {
      for (let i = 0; i < w.word.length; i++)
        cells.push(`${w.startCol + i},${w.startRow}`);
      if (cells.some((k) => occupiedH.has(k))) continue;
      cells.forEach((k) => occupiedH.add(k));
    } else {
      for (let i = 0; i < w.word.length; i++)
        cells.push(`${w.startCol},${w.startRow - i}`);
      if (cells.some((k) => occupiedV.has(k))) continue;
      cells.forEach((k) => occupiedV.add(k));
    }
    result.push(w);
  }

  // Boundary check: a word is invalid if there is a placed letter immediately
  // adjacent to it in the same direction (touching its start or end).
  const bounded = result.filter((w) => {
    if (w.direction === "h") {
      const lc = w.startCol - 1;
      const rc = w.startCol + w.word.length;
      if (lc >= 0 && grid[lc].length > w.startRow) return false;
      if (rc < columns && grid[rc].length > w.startRow) return false;
    } else {
      if (w.startRow + 1 < grid[w.startCol].length) return false;
      if (w.startRow - w.word.length >= 0) return false;
    }
    return true;
  });

  // Extraneous letter validation: every placed letter must be part of a scored word.
  // Loop until stable — removing a word can expose new uncovered letters.
  let scored = bounded;
  let changed = true;
  while (changed) {
    changed = false;
    const scoredCells = new Set<string>();
    const hCovered = new Set<string>();
    const vCovered = new Set<string>();
    for (const w of scored) {
      if (w.direction === "h") {
        for (let i = 0; i < w.word.length; i++) {
          const key = `${w.startCol + i},${w.startRow}`;
          scoredCells.add(key);
          hCovered.add(key);
        }
      } else {
        for (let i = 0; i < w.word.length; i++) {
          const key = `${w.startCol},${w.startRow - i}`;
          scoredCells.add(key);
          vCovered.add(key);
        }
      }
    }

    // Any horizontal run of 2+ letters must be fully covered by a horizontal word
    const badCells = new Set<string>();
    for (let r = 0; r < maxHeight; r++) {
      let runStart = -1,
        runLen = 0;
      const checkRun = (endC: number) => {
        if (runLen >= 2) {
          for (let c = runStart; c < endC; c++) {
            if (!hCovered.has(`${c},${r}`)) badCells.add(`${c},${r}`);
          }
        }
        runLen = 0;
        runStart = -1;
      };
      for (let c = 0; c < columns; c++) {
        if (grid[c]?.[r]) {
          if (!runLen) runStart = c;
          runLen++;
        } else checkRun(c);
      }
      checkRun(columns);
    }

    // Vertical: any column with 2+ letters must be fully covered by a vertical word
    for (let c = 0; c < columns; c++) {
      const colLen = grid[c]?.length ?? 0;
      if (colLen >= 2) {
        for (let r = 0; r < colLen; r++) {
          if (!vCovered.has(`${c},${r}`)) badCells.add(`${c},${r}`);
        }
      }
    }

    const next = scored.filter((w) => {
      if (w.direction === "h") {
        for (let c = w.startCol; c < w.startCol + w.word.length; c++) {
          for (let r = 0; r < grid[c].length; r++) {
            if (r !== w.startRow && !scoredCells.has(`${c},${r}`)) return false;
          }
        }
        for (let i = 0; i < w.word.length; i++)
          if (badCells.has(`${w.startCol + i},${w.startRow}`)) return false;
      } else {
        const bottom = w.startRow - w.word.length + 1;
        for (let r = 0; r < grid[w.startCol].length; r++) {
          if (
            (r < bottom || r > w.startRow) &&
            !scoredCells.has(`${w.startCol},${r}`)
          )
            return false;
        }
        for (let i = 0; i < w.word.length; i++)
          if (badCells.has(`${w.startCol},${w.startRow - i}`)) return false;
      }
      return true;
    });
    if (next.length < scored.length) {
      scored = next;
      changed = true;
    }
  }
  return scored;
}

export function computeHighlightedCells(
  words: DetectedWord[],
): Map<string, number> {
  const cells = new Map<string, number>();
  words.forEach((w, wordIdx) => {
    if (w.direction === "h") {
      for (let i = 0; i < w.word.length; i++)
        cells.set(`${w.startCol + i},${w.startRow}`, wordIdx);
    } else {
      for (let i = 0; i < w.word.length; i++)
        cells.set(`${w.startCol},${w.startRow - i}`, wordIdx);
    }
  });
  return cells;
}

export function useVerba(puzzle: VerbaPuzzle, savedState?: VerbaSavedState) {
  const [grid, setGrid] = useState<Grid>(
    () => savedState?.grid ?? Array.from({ length: puzzle.columns }, () => []),
  );
  const [bank, setBank] = useState<BankTile[]>(() => {
    const allTiles = puzzle.letters.map((letter, i) => ({ id: i, letter }));
    if (!savedState?.history?.length) return allTiles;
    const placedIds = new Set(savedState.history.map((h) => h.tileId));
    return allTiles.filter((t) => !placedIds.has(t.id));
  });
  const [history, setHistory] = useState<{ tileId: number; colIdx: number }[]>(
    () => savedState?.history ?? [],
  );
  const [timeLeft, setTimeLeft] = useState(() =>
    savedState?.timeLeft && savedState.timeLeft > 0
      ? savedState.timeLeft
      : GAME_DURATION,
  );
  const [wordSet, setWordSet] = useState<Set<string> | null>(null);

  const gameOver = useMemo(() => timeLeft <= 0, [timeLeft]);

  // Load word set once
  useEffect(() => {
    getWordSet().then(setWordSet);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (gameOver) return;
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, gameOver]);

  const detectedWords = useMemo(
    () => (wordSet ? computeDetectedWords(grid, puzzle.columns, wordSet) : []),
    [grid, wordSet, puzzle.columns],
  );

  const totalScore = useMemo(
    () => detectedWords.reduce((sum, w) => sum + w.score, 0),
    [detectedWords],
  );

  const highlightedCells = useMemo(
    () => computeHighlightedCells(detectedWords),
    [detectedWords],
  );

  const canPlace = useCallback(
    (colIdx: number): boolean => {
      return !gameOver && grid[colIdx].length < MAX_COL_HEIGHT;
    },
    [gameOver, grid],
  );

  const placeTile = useCallback(
    (tileId: number, colIdx: number) => {
      if (!canPlace(colIdx)) return;
      const tile = bank.find((t) => t.id === tileId);
      if (!tile) return;
      setGrid((prev) =>
        prev.map((col, i) => (i === colIdx ? [...col, tile.letter] : col)),
      );
      setBank((prev) => prev.filter((t) => t.id !== tileId));
      setHistory((prev) => [...prev, { tileId, colIdx }]);
    },
    [bank, canPlace],
  );

  const removeTopTile = useCallback(
    (colIdx: number) => {
      if (gameOver) return;
      const col = grid[colIdx];
      if (col.length === 0) return;
      // Find which tile is on top of this column (most recently placed in this col)
      const lastHistoryIdx = [...history]
        .reverse()
        .findIndex((h) => h.colIdx === colIdx);
      if (lastHistoryIdx === -1) return;
      const historyIdx = history.length - 1 - lastHistoryIdx;
      const { tileId } = history[historyIdx];
      const letter = col[col.length - 1];
      setGrid((prev) =>
        prev.map((c, i) => (i === colIdx ? c.slice(0, -1) : c)),
      );
      setBank((prev) => [...prev, { id: tileId, letter }]);
      setHistory((prev) => prev.filter((_, i) => i !== historyIdx));
    },
    [gameOver, grid, history],
  );

  const undo = useCallback(() => {
    if (gameOver || history.length === 0) return;
    const last = history[history.length - 1];
    const col = grid[last.colIdx];
    const letter = col[col.length - 1];
    setGrid((prev) =>
      prev.map((c, i) => (i === last.colIdx ? c.slice(0, -1) : c)),
    );
    setBank((prev) => [...prev, { id: last.tileId, letter }]);
    setHistory((prev) => prev.slice(0, -1));
  }, [gameOver, grid, history]);

  const restoreGrid = useCallback((restored: Grid) => {
    setGrid(restored);
  }, []);

  return {
    grid,
    bank,
    history,
    timeLeft,
    gameOver,
    detectedWords,
    totalScore,
    highlightedCells,
    canPlace,
    placeTile,
    removeTopTile,
    undo,
    restoreGrid,
  };
}
