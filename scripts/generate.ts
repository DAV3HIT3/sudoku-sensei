/**
 * Adds generated puzzles to content/puzzles.txt until each technique is the
 * hardest one needed by `--per` puzzles (default 12), or time runs out
 * (`--minutes`, default 5). Puzzles the catalog cannot solve are thrown away.
 *
 *   node scripts/generate.ts [--per 12] [--minutes 5]
 *
 * Commit the file; the app grades and stores new lines on its next start.
 */
import { readFileSync, appendFileSync } from "node:fs";
import { format, parse, solve, type Grid } from "../lib/sudoku/grid.ts";
import { grade, TECHNIQUES } from "../lib/sudoku/solver.ts";

const arg = (name: string, dflt: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? Number(process.argv[i + 1]) : dflt;
};
const per = arg("per", 12);
const deadline = Date.now() + arg("minutes", 5) * 60_000;
const file = new URL("../content/puzzles.txt", import.meta.url);

const shuffle = <T>(xs: T[]) => {
  for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; }
  return xs;
};

/**
 * A random solved grid. The three boxes on the diagonal share no row, column or
 * box, so any digits fill them without conflict, and the rest always completes.
 */
function randomSolution(): Grid {
  const g: Grid = Array(81).fill(0);
  for (const b of [0, 4, 8]) {
    const ds = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (let i = 0; i < 9; i++) g[(Math.floor(b / 3) * 3 + Math.floor(i / 3)) * 9 + (b % 3) * 3 + (i % 3)] = ds[i];
  }
  return solve(g, 1)[0];
}

/** Removes givens in random order while the solution stays unique, down to `floor`. */
function carve(solution: Grid, floor: number): Grid {
  const g = [...solution];
  let givens = 81;
  for (const c of shuffle([...Array(81).keys()])) {
    if (givens <= floor) break;
    const v = g[c];
    g[c] = 0;
    if (solve(g).length === 1) givens--;
    else g[c] = v;
  }
  return g;
}

const lines = readFileSync(file, "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#"));
const have = new Set(lines.map((l) => format(parse(l.split(" ")[0]))));
const count = new Map<string, number>(TECHNIQUES.map((t) => [t.slug, 0]));
for (const g of have) {
  const r = grade(parse(g));
  if (r.solved && r.difficulty >= 0) count.set(TECHNIQUES[r.difficulty].slug, count.get(TECHNIQUES[r.difficulty].slug)! + 1);
}

const today = new Date().toISOString().slice(0, 10);
let tried = 0, added = 0;
while (Date.now() < deadline && [...count.values()].some((n) => n < per)) {
  tried++;
  // Mostly minimal puzzles, which run harder; some stopped early, which run easier.
  const puzzle = carve(randomSolution(), Math.random() < 0.7 ? 17 : 26 + Math.floor(Math.random() * 10));
  const key = format(puzzle);
  if (have.has(key)) continue;
  const r = grade(puzzle);
  if (!r.solved || r.difficulty < 0) continue;
  const slug = TECHNIQUES[r.difficulty].slug;
  if (count.get(slug)! >= per) continue;
  count.set(slug, count.get(slug)! + 1);
  have.add(key);
  appendFileSync(file, `${key} Generated ${today}\n`);
  added++;
}
console.log(`tried ${tried}, added ${added}`);
for (const [slug, n] of count) console.log(`${String(n).padStart(4)}  ${slug}${n < per ? "  (short)" : ""}`);
