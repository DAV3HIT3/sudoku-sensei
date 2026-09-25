import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { drills, puzzles, techniques } from "@/db/schema";

export const listTechniques = () => getDb().select().from(techniques).orderBy(asc(techniques.sort));

export async function getTechnique(slug: string) {
  const [t] = await getDb().select().from(techniques).where(eq(techniques.slug, slug));
  return t ?? null;
}

/** A stored drill to show as the worked example: the one with the least clutter (most cells filled). */
export async function exampleOf(slug: string) {
  const rows = await getDb()
    .select({ position: drills.position, step: drills.step, givens: puzzles.givens, puzzleId: puzzles.id })
    .from(drills)
    .innerJoin(puzzles, eq(puzzles.id, drills.puzzleId))
    .where(eq(drills.technique, slug));
  const filled = (r: (typeof rows)[number]) => r.position.values.filter(Boolean).length;
  return rows.reduce<(typeof rows)[number] | null>((best, r) => (!best || filled(r) > filled(best) ? r : best), null);
}

/** Puzzles whose hardest step is this technique. */
export const puzzlesNeeding = (sort: number) =>
  getDb().select({ id: puzzles.id }).from(puzzles).where(eq(puzzles.difficulty, sort)).orderBy(asc(puzzles.id));
