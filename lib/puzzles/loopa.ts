export interface LoopaPuzzle {
  clues: number[][];
}

const N = 5;
type EdgeKey = string;
const hKey = (r: number, c: number): EdgeKey => `h${r},${c}`;
const vKey = (r: number, c: number): EdgeKey => `v${r},${c}`;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dotNeighbors(r: number, c: number): [number, number][] {
  const res: [number, number][] = [];
  if (r > 0) res.push([r - 1, c]);
  if (r < N) res.push([r + 1, c]);
  if (c > 0) res.push([r, c - 1]);
  if (c < N) res.push([r, c + 1]);
  return res;
}

export function generateLoopa(): LoopaPuzzle {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const visited = new Set<string>(['0,0']);
    const path: [number, number][] = [[0, 0]];

    const dfs = (): boolean => {
      const [r, c] = path[path.length - 1];
      if (path.length >= 10) {
        if (dotNeighbors(r, c).some(([nr, nc]) => nr === 0 && nc === 0)) return true;
      }
      const ns = shuffle(
        dotNeighbors(r, c).filter(([nr, nc]) => !visited.has(`${nr},${nc}`)),
      );
      for (const [nr, nc] of ns) {
        visited.add(`${nr},${nc}`);
        path.push([nr, nc]);
        if (dfs()) return true;
        path.pop();
        visited.delete(`${nr},${nc}`);
      }
      return false;
    };

    if (!dfs()) continue;

    const solution = new Set<EdgeKey>();
    for (let i = 0; i < path.length; i++) {
      const [r1, c1] = path[i];
      const [r2, c2] = path[(i + 1) % path.length];
      if (r1 === r2) solution.add(hKey(r1, Math.min(c1, c2)));
      else solution.add(vKey(Math.min(r1, r2), c1));
    }

    const clues = Array.from({ length: N }, (_, r) =>
      Array.from({ length: N }, (_, c) => {
        let n = 0;
        if (solution.has(hKey(r, c))) n++;
        if (solution.has(hKey(r + 1, c))) n++;
        if (solution.has(vKey(r, c))) n++;
        if (solution.has(vKey(r, c + 1))) n++;
        return n;
      }),
    );

    return { clues };
  }

  return { clues: Array.from({ length: N }, () => Array(N).fill(0)) };
}
