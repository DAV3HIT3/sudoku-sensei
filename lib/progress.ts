import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { drillAttempts, drills, games, lessonProgress, puzzles } from "@/db/schema";
import { dailyPuzzle, drillScore, mastery, recommend, type Evidence } from "@/lib/mastery";
import { TECHNIQUES } from "@/lib/sudoku/solver";

export async function lessonStage(userId: number, technique: string) {
  const [r] = await getDb()
    .select({ stage: lessonProgress.stage, done: lessonProgress.completedAt })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.technique, technique)));
  return r ? { stage: r.stage, done: r.done !== null } : { stage: 0, done: false };
}

export async function saveLessonStage(userId: number, technique: string, stage: number, last: boolean) {
  await getDb()
    .insert(lessonProgress)
    .values({ userId, technique, stage, completedAt: last ? new Date() : null })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.technique],
      set: {
        stage,
        updatedAt: sql`now()`,
        ...(last ? { completedAt: sql`coalesce(${lessonProgress.completedAt}, now())` } : {}),
      },
    });
}

export async function recordDrill(userId: number, drillId: number, correct: boolean) {
  await getDb().insert(drillAttempts).values({ userId, drillId, correct });
}

/** Drills answered and answered right, per technique, for one player. */
export async function drillStats(userId: number, technique?: string) {
  const rows = await getDb()
    .select({
      technique: drills.technique,
      tried: sql<number>`count(*)::int`,
      right: sql<number>`count(*) filter (where ${drillAttempts.correct})::int`,
    })
    .from(drillAttempts)
    .innerJoin(drills, eq(drills.id, drillAttempts.drillId))
    .where(and(eq(drillAttempts.userId, userId), technique ? eq(drills.technique, technique) : undefined))
    .groupBy(drills.technique);
  return new Map(rows.map((r) => [r.technique, { tried: r.tried, right: r.right }]));
}

/** Techniques whose lesson this player has finished. */
export async function lessonsDone(userId: number) {
  const rows = await getDb()
    .select({ technique: lessonProgress.technique })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), sql`${lessonProgress.completedAt} is not null`));
  return new Set(rows.map((r) => r.technique));
}

/**
 * Everything the home and progress pages need to train a player: mastery per
 * technique with the evidence behind it, the game in progress, today's puzzle.
 */
export async function training(userId: number, now = Date.now()) {
  const db = getDb();
  const [attempts, played, done, all] = await Promise.all([
    db.select({ technique: drills.technique, correct: drillAttempts.correct, at: drillAttempts.createdAt })
      .from(drillAttempts).innerJoin(drills, eq(drills.id, drillAttempts.drillId))
      .where(eq(drillAttempts.userId, userId)).orderBy(desc(drillAttempts.createdAt)),
    db.select({ puzzleId: games.puzzleId, difficulty: puzzles.difficulty, hints: games.hints, finishedAt: games.finishedAt, updatedAt: games.updatedAt })
      .from(games).innerJoin(puzzles, eq(puzzles.id, games.puzzleId))
      .where(eq(games.userId, userId)).orderBy(desc(games.updatedAt)),
    lessonsDone(userId),
    db.select({ id: puzzles.id, difficulty: puzzles.difficulty }).from(puzzles).orderBy(asc(puzzles.id)),
  ]);
  const solved = new Set(played.filter((g) => g.finishedAt).map((g) => g.puzzleId));
  const monthAgo = now - 30 * 86_400_000;

  const techniques = TECHNIQUES.map((t, sort) => {
    const mine = attempts.filter((a) => a.technique === t.slug).map((a) => ({ correct: a.correct, at: a.at.getTime() }));
    const solves = played.filter((g) => g.finishedAt && g.difficulty === sort);
    const practised = [...mine.slice(0, 1).map((d) => d.at), ...solves.map((g) => g.finishedAt!.getTime())];
    const evidence: Evidence = {
      drills: mine,
      cleanSolves: solves.filter((g) => !g.hints.some((h) => h.technique === t.slug && h.level === 3)).length,
      hints: played.filter((g) => g.updatedAt.getTime() >= monthAgo).flatMap((g) => g.hints.filter((h) => h.technique === t.slug)),
      lastPracticed: practised.length ? Math.max(...practised) : null,
    };
    return {
      slug: t.slug,
      name: t.name,
      tier: t.tier,
      evidence,
      mastery: mastery(evidence, now),
      lessonDone: done.has(t.slug),
      drillScore: drillScore(evidence),
      nextPuzzle: all.find((p) => p.difficulty === sort && !solved.has(p.id))?.id ?? null,
    };
  });

  const inProgress = played.find((g) => !g.finishedAt)?.puzzleId ?? null;
  const daily = dailyPuzzle(all.filter((p) => p.difficulty !== null).map((p) => p.id), now);
  return {
    techniques,
    next: recommend(inProgress, techniques, daily),
    // What the training loop would suggest if the game in progress were set aside.
    focus: recommend(null, techniques, daily),
    daily,
    dailySolved: solved.has(daily),
  };
}
