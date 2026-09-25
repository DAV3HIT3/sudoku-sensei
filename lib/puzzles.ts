import { readFile } from "node:fs/promises";
import path from "node:path";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { puzzles } from "@/db/schema";
import { format, parse, solve } from "@/lib/sudoku/grid";

/** Adds any puzzle in content/puzzles.txt not already stored. Runs on start-up. */
export async function seedPuzzles(): Promise<void> {
  const text = await readFile(path.join(process.cwd(), "content", "puzzles.txt"), "utf8");
  const rows = [];
  for (const line of text.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [givens, ...source] = line.trim().split(" ");
    const grid = parse(givens);
    const solutions = solve(grid);
    if (solutions.length !== 1) throw new Error(`content/puzzles.txt: ${givens} has ${solutions.length === 0 ? "no" : "several"} solutions`);
    rows.push({ givens: format(grid), solution: format(solutions[0]), source: source.join(" ") });
  }
  if (rows.length) await getDb().insert(puzzles).values(rows).onConflictDoNothing();
}

export const listPuzzles = () =>
  getDb().select({ id: puzzles.id, givens: puzzles.givens, source: puzzles.source }).from(puzzles).orderBy(asc(puzzles.id));

export async function getPuzzle(id: number) {
  const [p] = await getDb().select().from(puzzles).where(eq(puzzles.id, id));
  return p ?? null;
}
