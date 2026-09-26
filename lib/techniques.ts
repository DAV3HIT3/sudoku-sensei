import { and, asc, eq, ne, notInArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { drillAttempts, drills, puzzles, techniques } from "@/db/schema";
import type { Position, Step } from "@/lib/sudoku/solver";

export const listTechniques = () => getDb().select().from(techniques).orderBy(asc(techniques.sort));

export async function getTechnique(slug: string) {
  const [t] = await getDb().select().from(techniques).where(eq(techniques.slug, slug));
  return t ?? null;
}

const drillColumns = { id: drills.id, position: drills.position, step: drills.step, givens: puzzles.givens, puzzleId: puzzles.id };
export type DrillView = { id: number; position: Position; step: Step; givens: string; puzzleId: number };

/** The lesson's worked examples: the n stored drills with the least clutter (most cells filled). */
export async function examplesOf(slug: string, n = 3): Promise<DrillView[]> {
  const rows = await getDb()
    .select(drillColumns)
    .from(drills)
    .innerJoin(puzzles, eq(puzzles.id, drills.puzzleId))
    .where(eq(drills.technique, slug))
    .orderBy(asc(drills.id));
  const filled = (r: DrillView) => r.position.values.filter(Boolean).length;
  return rows.sort((a, b) => filled(b) - filled(a) || a.id - b.id).slice(0, n);
}

/**
 * A drill to practise: one this player has not yet got right, at random, and
 * never the one just answered while there is another.
 */
export async function nextDrill(userId: number, slug: string, after?: number): Promise<DrillView | null> {
  const solved = getDb()
    .select({ id: drillAttempts.drillId })
    .from(drillAttempts)
    .where(and(eq(drillAttempts.userId, userId), eq(drillAttempts.correct, true)));
  const pick = (fresh: boolean) =>
    getDb()
      .select(drillColumns)
      .from(drills)
      .innerJoin(puzzles, eq(puzzles.id, drills.puzzleId))
      .where(and(eq(drills.technique, slug), after ? ne(drills.id, after) : undefined, fresh ? notInArray(drills.id, solved) : undefined))
      .orderBy(sql`random()`)
      .limit(1);
  const fresh = await pick(true);
  const [d] = fresh.length ? fresh : await pick(false);
  return d ?? null;
}

export async function getDrill(id: number) {
  const [d] = await getDb().select().from(drills).where(eq(drills.id, id));
  return d ?? null;
}

/** Puzzles whose hardest step is this technique. */
export const puzzlesNeeding = (sort: number) =>
  getDb().select({ id: puzzles.id }).from(puzzles).where(and(eq(puzzles.difficulty, sort), eq(puzzles.retired, false))).orderBy(asc(puzzles.id));
