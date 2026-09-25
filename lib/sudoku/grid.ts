/**
 * A grid is 81 digits, row by row, 0 for empty. Candidates are bitmasks: bit d
 * set means digit d (1-9) is possible, so ALL is 0b1111111110.
 */
export type Grid = number[];

export const ALL = 0b1111111110;

export const row = (c: number) => Math.floor(c / 9);
export const col = (c: number) => c % 9;
export const box = (c: number) => Math.floor(row(c) / 3) * 3 + Math.floor(col(c) / 3);

/** The 20 cells that share a row, column or box with each cell. */
export const PEERS: number[][] = Array.from({ length: 81 }, (_, c) =>
  Array.from({ length: 81 }, (_, p) => p).filter(
    (p) => p !== c && (row(p) === row(c) || col(p) === col(c) || box(p) === box(c)),
  ),
);

/** "003020600..." or "..3.2.6.." (81 characters) to a grid. */
export function parse(s: string): Grid {
  const t = s.trim();
  if (!/^[0-9.]{81}$/.test(t)) throw new Error(`not a puzzle: ${s}`);
  return [...t].map((ch) => (ch === "." ? 0 : Number(ch)));
}

export const format = (g: Grid) => g.join("");

/** Cells whose digit also appears in one of their peers. */
export function conflicts(g: Grid): Set<number> {
  const bad = new Set<number>();
  for (let c = 0; c < 81; c++)
    if (g[c] && PEERS[c].some((p) => g[p] === g[c])) bad.add(c);
  return bad;
}

/** The digits each empty cell could hold, from its peers' digits alone. Filled cells get 0. */
export function candidates(g: Grid): number[] {
  return g.map((v, c) => {
    if (v) return 0;
    let m = ALL;
    for (const p of PEERS[c]) m &= ~(1 << g[p]);
    return m;
  });
}

/**
 * Solves by backtracking, stopping once it has found `limit` solutions. Used to
 * check a puzzle has exactly one (solve(g).length === 1), not to teach.
 */
export function solve(g: Grid, limit = 2): Grid[] {
  const out: Grid[] = [];
  if (conflicts(g).size) return out;
  const cur = [...g];
  const cand = candidates(cur);
  (function search(): void {
    // The empty cell with the fewest candidates, so dead ends show up early.
    let best = -1, bestCount = 10;
    for (let c = 0; c < 81; c++) {
      if (cur[c]) continue;
      const n = popcount(cand[c]);
      if (n < bestCount) { best = c; bestCount = n; if (n <= 1) break; }
    }
    if (best < 0) { out.push([...cur]); return; }
    for (let d = 1; d <= 9 && out.length < limit; d++) {
      if (!(cand[best] & (1 << d))) continue;
      const changed: number[] = [];
      cur[best] = d;
      for (const p of PEERS[best])
        if (!cur[p] && cand[p] & (1 << d)) { cand[p] &= ~(1 << d); changed.push(p); }
      if (changed.every((p) => cand[p])) search();
      for (const p of changed) cand[p] |= 1 << d;
      cur[best] = 0;
    }
  })();
  return out;
}

export function popcount(m: number): number {
  let n = 0;
  for (; m; m &= m - 1) n++;
  return n;
}

/**
 * `state` as a saved board of the puzzle with these givens, or null if it is not
 * one: 81 digits keeping every given, 81 pencil-mark masks, and 81 paint colours
 * (0-4; missing in boards saved before colouring existed, which means none).
 * Guards what the browser sends before it is stored.
 */
export function boardOf(givens: string, state: unknown): { values: string; notes: number[]; colors: number[] } | null {
  const s = state as { values?: unknown; notes?: unknown; colors?: unknown } | null;
  if (typeof s?.values !== "string" || !/^[0-9]{81}$/.test(s.values)) return null;
  const values = s.values;
  if (![...givens].every((g, i) => g === "0" || values[i] === g)) return null;
  if (!Array.isArray(s.notes) || s.notes.length !== 81) return null;
  if (!s.notes.every((n) => Number.isInteger(n) && (n & ~ALL) === 0)) return null;
  const colors = s.colors ?? Array(81).fill(0);
  if (!Array.isArray(colors) || colors.length !== 81 || !colors.every((k) => Number.isInteger(k) && k >= 0 && k <= 4)) return null;
  return { values, notes: s.notes as number[], colors: colors as number[] };
}
