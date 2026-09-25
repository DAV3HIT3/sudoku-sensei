/**
 * How well a player knows each technique, and what they should do next. Pure:
 * lib/progress.ts gathers the evidence from the database.
 *
 * Mastery is a formula, not a model:
 *   - drills: right answers among the last five, out of five;
 *   - puzzles: clean solves (no full hint on this technique) of puzzles whose
 *     hardest step is this technique, out of three;
 *   - take the better of the two, less 0.1 for each full hint (level 3) and 0.03
 *     for each lighter one taken on this technique in the last 30 days;
 *   - after two weeks without practice it fades, halving every two months.
 * 0.8 or more counts as mastered.
 */

export const MASTERED = 0.8;
const DAY = 86_400_000;

export type Evidence = {
  /** Drill answers for this technique, newest first. */
  drills: { correct: boolean; at: number }[];
  /** Solved puzzles whose hardest step is this technique, without a full hint on it. */
  cleanSolves: number;
  /** Hints on this technique in the last 30 days. */
  hints: { level: number }[];
  /** Latest drill or solve on this technique. */
  lastPracticed: number | null;
};

export function drillScore(e: Evidence) {
  return e.drills.slice(0, 5).filter((d) => d.correct).length / 5;
}

export function mastery(e: Evidence, now: number): number {
  const evidence = Math.max(drillScore(e), Math.min(1, e.cleanSolves / 3));
  const penalty = e.hints.reduce((p, h) => p + (h.level === 3 ? 0.1 : 0.03), 0);
  const idle = e.lastPracticed === null ? 0 : Math.max(0, (now - e.lastPracticed) / DAY - 14);
  return Math.max(0, Math.min(1, evidence - Math.min(penalty, 0.5)) * 0.5 ** (idle / 60));
}

export type TechniqueState = {
  slug: string;
  mastery: number;
  lessonDone: boolean;
  drillScore: number;
  /** An unsolved puzzle whose hardest step is this technique, if any. */
  nextPuzzle: number | null;
};

export type Next =
  | { kind: "continue"; puzzleId: number }
  | { kind: "lesson"; technique: string }
  | { kind: "drills"; technique: string }
  | { kind: "puzzle"; technique: string; puzzleId: number }
  | { kind: "daily"; puzzleId: number };

/**
 * The one thing to do next. A game in progress comes first. Otherwise the first
 * technique, easiest first, not yet mastered: its lesson, then its drills, then a
 * puzzle that needs it. With everything mastered, today's puzzle.
 */
export function recommend(inProgress: number | null, techniques: TechniqueState[], daily: number): Next {
  if (inProgress !== null) return { kind: "continue", puzzleId: inProgress };
  const focus = techniques.find((t) => t.mastery < MASTERED);
  if (!focus) return { kind: "daily", puzzleId: daily };
  if (!focus.lessonDone) return { kind: "lesson", technique: focus.slug };
  if (focus.drillScore < MASTERED || focus.nextPuzzle === null) return { kind: "drills", technique: focus.slug };
  return { kind: "puzzle", technique: focus.slug, puzzleId: focus.nextPuzzle };
}

/**
 * Today's puzzle: the same for everyone on a given day, cycling through the list.
 * The day turns at midnight in the server's time zone (TZ in deploy/compose.yml).
 */
export function dailyPuzzle(ids: number[], now: number): number {
  const local = now - new Date(now).getTimezoneOffset() * 60_000;
  return ids[Math.floor(local / DAY) % ids.length];
}
