import { useState, useEffect, useMemo, useCallback } from 'react';
import type { LoopaPuzzle } from '@/lib/puzzles/loopa';

export type EdgeKey = string;
export const hKey = (r: number, c: number): EdgeKey => `h${r},${c}`;
export const vKey = (r: number, c: number): EdgeKey => `v${r},${c}`;

const N = 5;

function cellEdgeCount(edges: Set<EdgeKey>, r: number, c: number): number {
  let n = 0;
  if (edges.has(hKey(r, c))) n++;
  if (edges.has(hKey(r + 1, c))) n++;
  if (edges.has(vKey(r, c))) n++;
  if (edges.has(vKey(r, c + 1))) n++;
  return n;
}

function isValidLoop(edges: Set<EdgeKey>): boolean {
  if (edges.size === 0) return false;
  const degree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    const type = edge[0];
    const [rs, cs] = edge.slice(1).split(',');
    const r = +rs, c = +cs;
    const [d1, d2] =
      type === 'h'
        ? [`${r},${c}`, `${r},${c + 1}`]
        : [`${r},${c}`, `${r + 1},${c}`];
    degree.set(d1, (degree.get(d1) ?? 0) + 1);
    degree.set(d2, (degree.get(d2) ?? 0) + 1);
    if (!adj.has(d1)) adj.set(d1, []);
    if (!adj.has(d2)) adj.set(d2, []);
    adj.get(d1)!.push(d2);
    adj.get(d2)!.push(d1);
  }
  for (const deg of degree.values()) if (deg !== 2) return false;
  const start = degree.keys().next().value!;
  const visited = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const dot = queue.shift()!;
    for (const nb of adj.get(dot) ?? []) {
      if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
    }
  }
  return visited.size === degree.size;
}

export function activeDots(edges: Set<EdgeKey>): Set<string> {
  const dots = new Set<string>();
  for (const edge of edges) {
    const type = edge[0];
    const [rs, cs] = edge.slice(1).split(',');
    const r = +rs, c = +cs;
    if (type === 'h') { dots.add(`${r},${c}`); dots.add(`${r},${c + 1}`); }
    else { dots.add(`${r},${c}`); dots.add(`${r + 1},${c}`); }
  }
  return dots;
}

export { cellEdgeCount };

export function useLoopa(
  puzzle: LoopaPuzzle,
  options?: { initialElapsed?: number; paused?: boolean; savedEdges?: string[] },
) {
  const paused = options?.paused ?? false;

  const [edges, setEdges] = useState<Set<EdgeKey>>(
    () => new Set(options?.savedEdges ?? []),
  );
  const [elapsed, setElapsed] = useState(options?.initialElapsed ?? 0);

  const solved = useMemo(() => {
    if (edges.size === 0) return false;
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++)
        if (cellEdgeCount(edges, r, c) !== puzzle.clues[r][c]) return false;
    return isValidLoop(edges);
  }, [edges, puzzle]);

  const litDots = useMemo(() => activeDots(edges), [edges]);

  useEffect(() => {
    if (solved || paused) return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [solved, paused]);

  const toggleEdge = useCallback((key: EdgeKey) => {
    if (solved) return;
    setEdges(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, [solved]);

  const reset = useCallback(() => setEdges(new Set()), []);

  const restoreEdges = useCallback((saved: string[]) => {
    setEdges(new Set(saved));
  }, []);

  return { edges, elapsed, solved, litDots, toggleEdge, reset, restoreEdges };
}
