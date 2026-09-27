import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { games, puzzles, type GameState, type HintTaken } from "@/db/schema";
import { nextInGroup, type GameStatus } from "@/lib/mastery";
import { getPuzzle } from "@/lib/puzzles";
import { boardOf } from "@/lib/sudoku/grid";
import { TECHNIQUES } from "@/lib/sudoku/solver";

export type SavedGame = { state: GameState; hints: HintTaken[]; updatedAt: number };

export async function getGame(userId: number, puzzleId: number): Promise<SavedGame | null> {
  const [g] = await getDb()
    .select({ state: games.state, hints: games.hints, updatedAt: games.updatedAt })
    .from(games)
    .where(and(eq(games.userId, userId), eq(games.puzzleId, puzzleId)));
  return g ? { ...g, updatedAt: g.updatedAt.getTime() } : null;
}

/**
 * Stores a board sent by the browser, after checking it is a board of this puzzle.
 * Last write wins: two devices playing the same puzzle at the same moment
 * overwrite each other, which is fine for one person moving between devices.
 */
export async function saveGame(userId: number, puzzleId: number, state: unknown, hintsTaken: unknown): Promise<SavedGame> {
  const puzzle = await getPuzzle(puzzleId);
  if (!puzzle) throw new Error("no such puzzle");
  const clean = boardOf(puzzle.givens, state);
  if (!clean) throw new Error("not a board of this puzzle");
  const hints = hintsOf(hintsTaken);
  if (!hints) throw new Error("not a list of hints");
  const solved = clean.values === puzzle.solution;
  const [g] = await getDb()
    .insert(games)
    .values({ userId, puzzleId, state: clean, hints, finishedAt: solved ? new Date() : null })
    .onConflictDoUpdate({
      target: [games.userId, games.puzzleId],
      set: {
        state: clean,
        hints,
        updatedAt: sql`now()`,
        // Playing a move in a skipped game takes it up again.
        skippedAt: null,
        // Keeps the first finish; a restart (unsolved again) clears it.
        finishedAt: solved ? sql`coalesce(${games.finishedAt}, now())` : null,
      },
    })
    .returning({ updatedAt: games.updatedAt });
  return { state: clean, hints, updatedAt: g.updatedAt.getTime() };
}

const HINT_KINDS = new Set([...TECHNIQUES.map((t) => t.slug), "mistake"]);

function hintsOf(x: unknown): HintTaken[] | null {
  if (!Array.isArray(x) || x.length > 1000) return null;
  const ok = x.every((h) => HINT_KINDS.has(h?.technique) && [1, 2, 3].includes(h?.level));
  return ok ? x.map((h) => ({ technique: h.technique, level: h.level })) : null;
}

/** Each puzzle this player has touched: solved, skipped, or still in progress. */
export async function gameStatuses(userId: number): Promise<Map<number, GameStatus>> {
  const rows = await getDb()
    .select({ puzzleId: games.puzzleId, finishedAt: games.finishedAt, skippedAt: games.skippedAt })
    .from(games)
    .where(eq(games.userId, userId));
  return new Map(rows.map((r) => [r.puzzleId, r.finishedAt ? "solved" : r.skippedAt ? "skipped" : "playing"]));
}

/**
 * Marks a puzzle skipped, starting a game on it if there is none yet so the skip
 * is remembered. A solved game stays solved.
 */
export async function skipGame(userId: number, puzzleId: number): Promise<void> {
  const puzzle = await getPuzzle(puzzleId);
  if (!puzzle) throw new Error("no such puzzle");
  await getDb()
    .insert(games)
    .values({ userId, puzzleId, state: { values: puzzle.givens, notes: Array(81).fill(0) }, skippedAt: new Date() })
    .onConflictDoUpdate({
      target: [games.userId, games.puzzleId],
      set: { skippedAt: sql`case when ${games.finishedAt} is null then now() end` },
    });
}

/**
 * The puzzle to go to after this one: the next unsolved one in its group (same
 * hardest technique), named the way the home page numbers it, or null when the
 * group is done.
 */
export async function nextPuzzle(userId: number, puzzleId: number): Promise<{ id: number; label: string } | null> {
  const puzzle = await getPuzzle(puzzleId);
  if (!puzzle) return null;
  const group = await getDb()
    .select({ id: puzzles.id })
    .from(puzzles)
    .where(and(puzzle.difficulty === null ? isNull(puzzles.difficulty) : eq(puzzles.difficulty, puzzle.difficulty), eq(puzzles.retired, false)))
    .orderBy(asc(puzzles.id));
  const ids = group.map((p) => p.id);
  const status = await gameStatuses(userId);
  const id = nextInGroup(ids, (x) => status.get(x), puzzleId);
  if (id === null) return null;
  const name = puzzle.difficulty === null ? "Beyond the lessons" : TECHNIQUES[puzzle.difficulty].name;
  return { id, label: `${name} · puzzle ${ids.indexOf(id) + 1}` };
}
