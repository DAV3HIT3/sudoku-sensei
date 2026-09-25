import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { drillAttempts, drills, lessonProgress } from "@/db/schema";

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
