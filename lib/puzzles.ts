import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { drills, meta, puzzles, techniques } from "@/db/schema";
import { format, parse, solve } from "@/lib/sudoku/grid";
import { grade, TECHNIQUES } from "@/lib/sudoku/solver";

/**
 * Brings the database in line with the engine and content/puzzles.txt: the
 * technique catalog, every puzzle with its grade, and its drills. Runs on
 * start-up. Grading every puzzle takes seconds, so it happens only when the
 * solver's source or the puzzle file has changed since the last time (a
 * fingerprint in the meta table); the technique text is refreshed every time.
 */
export async function seedPuzzles(): Promise<void> {
  const db = getDb();
  const rows = await Promise.all(TECHNIQUES.map(async (t, sort) => {
    const body = writeUp(await readFile(path.join(process.cwd(), "content", "techniques", `${t.slug}.md`), "utf8"));
    return { slug: t.slug, name: t.name, tier: t.tier, sort, summary: body.split("\n\n")[0], body };
  }));
  await db
    .insert(techniques)
    .values(rows)
    .onConflictDoUpdate({
      target: techniques.slug,
      set: { name: sql`excluded.name`, tier: sql`excluded.tier`, sort: sql`excluded.sort`, summary: sql`excluded.summary`, body: sql`excluded.body` },
    });

  const text = await readFile(path.join(process.cwd(), "content", "puzzles.txt"), "utf8");
  // ENGINE_HASH comes from next.config.ts; without it (a bare test run) always regrade.
  const fingerprint = process.env.ENGINE_HASH && createHash("sha256").update(process.env.ENGINE_HASH).update(text).digest("hex");
  const [last] = await db.select({ value: meta.value }).from(meta).where(eq(meta.key, "graded"));
  if (fingerprint && last?.value === fingerprint) return;

  const graded = [];
  for (const line of text.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [givens, ...source] = line.trim().split(" ");
    const grid = parse(givens);
    const solutions = solve(grid);
    if (solutions.length !== 1) throw new Error(`content/puzzles.txt: ${givens} has ${solutions.length === 0 ? "no" : "several"} solutions`);
    const g = grade(grid);
    graded.push({
      row: {
        givens: format(grid),
        solution: format(solutions[0]),
        source: source.join(" "),
        difficulty: g.solved ? g.difficulty : null,
        techniques: g.techniques,
      },
      firstUses: g.firstUses,
    });
  }

  for (const chunk of chunks(graded, 200)) {
    const ids = await db
      .insert(puzzles)
      .values(chunk.map((x) => x.row))
      .onConflictDoUpdate({
        target: puzzles.givens,
        set: { source: sql`excluded.source`, difficulty: sql`excluded.difficulty`, techniques: sql`excluded.techniques` },
      })
      .returning({ id: puzzles.id, givens: puzzles.givens });
    const idOf = new Map(ids.map((r) => [r.givens, r.id]));
    const rows = chunk.flatMap((x) =>
      x.firstUses.map((u) => ({ puzzleId: idOf.get(x.row.givens)!, technique: u.step.technique, position: u.position, step: u.step })));
    for (const part of chunks(rows, 500))
      await db
        .insert(drills)
        .values(part)
        .onConflictDoUpdate({ target: [drills.puzzleId, drills.technique], set: { position: sql`excluded.position`, step: sql`excluded.step` } });
  }
  // Puzzles taken out of the file are retired: hidden everywhere, but kept while
  // anyone has a game on one or has answered one of its drills.
  const kept = graded.map((x) => x.row.givens);
  await db.update(puzzles).set({ retired: sql`not (${puzzles.givens} = any(${sql.param(kept)}::char(81)[]))` });
  // Retired puzzles nobody has played or drilled on go completely, drills and all.
  await db.execute(sql`delete from puzzles p where p.retired
    and not exists (select 1 from games g where g.puzzle_id = p.id)
    and not exists (select 1 from drill_attempts a join drills d on d.id = a.drill_id where d.puzzle_id = p.id)`);
  // Drills for techniques a regrade no longer uses.
  await db.execute(sql`delete from drills d using puzzles p where d.puzzle_id = p.id and not (d.technique = any(p.techniques))`);
  if (fingerprint)
    await db.insert(meta).values({ key: "graded", value: fingerprint })
      .onConflictDoUpdate({ target: meta.key, set: { value: fingerprint } });
}

/** A technique's write-up without its "# Name" heading (the name comes from the engine). */
export const writeUp = (md: string) => md.replace(/^# .*\n+/, "").trim();

function chunks<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

export const listPuzzles = () =>
  getDb()
    .select({ id: puzzles.id, givens: puzzles.givens, source: puzzles.source, difficulty: puzzles.difficulty })
    .from(puzzles)
    .where(eq(puzzles.retired, false))
    .orderBy(sql`${puzzles.difficulty} nulls last`, asc(puzzles.id));

export async function getPuzzle(id: number) {
  const [p] = await getDb().select().from(puzzles).where(eq(puzzles.id, id));
  return p ?? null;
}
