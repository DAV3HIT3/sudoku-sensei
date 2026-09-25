"use server";

import { recordDrill, saveLessonStage } from "@/lib/progress";
import { checkDrill, type Answer } from "@/lib/sudoku/drill";
import { TECHNIQUES } from "@/lib/sudoku/solver";
import { getDrill, nextDrill } from "@/lib/techniques";
import { currentUser } from "@/lib/user";

async function player() {
  const user = await currentUser();
  if (!user) throw new Error("not signed in");
  return user;
}

const isTechnique = (slug: unknown): slug is string => TECHNIQUES.some((t) => t.slug === slug);
const isCandidate = (c: unknown): c is { cell: number; digit: number } => {
  const x = c as { cell?: unknown; digit?: unknown } | null;
  return Number.isInteger(x?.cell) && Number.isInteger(x?.digit) &&
    (x!.cell as number) >= 0 && (x!.cell as number) < 81 && (x!.digit as number) >= 1 && (x!.digit as number) <= 9;
};

/** Stage of the lesson reached; `last` when the player has reached its end. */
export async function saveStage(slug: string, stage: number, last: boolean) {
  if (!isTechnique(slug) || !Number.isInteger(stage) || stage < 0 || stage > 100) throw new Error("bad lesson stage");
  await saveLessonStage((await player()).id, slug, stage, last === true);
}

/** Checks an answer on the server, records it, and returns the verdict with the step to show. */
export async function answerDrill(drillId: number, answer: Answer) {
  const user = await player();
  const drill = Number.isInteger(drillId) ? await getDrill(drillId) : null;
  if (!drill) throw new Error("no such drill");
  const clean: Answer = {
    place: answer?.place && isCandidate(answer.place) ? { cell: answer.place.cell, digit: answer.place.digit } : null,
    remove: Array.isArray(answer?.remove) ? answer.remove.filter(isCandidate).slice(0, 81).map((c) => ({ cell: c.cell, digit: c.digit })) : [],
  };
  const verdict = checkDrill(drill.position, drill.technique, clean);
  await recordDrill(user.id, drill.id, verdict.correct);
  return verdict;
}

export async function getNextDrill(slug: string, after: number) {
  if (!isTechnique(slug)) throw new Error("no such technique");
  return nextDrill((await player()).id, slug, Number.isInteger(after) ? after : undefined);
}
