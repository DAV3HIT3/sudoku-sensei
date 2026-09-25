import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { games, type GameState, type HintTaken } from "@/db/schema";
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

/** Each puzzle this player has touched: solved or still in progress. */
export async function gameStatuses(userId: number): Promise<Map<number, "solved" | "playing">> {
  const rows = await getDb()
    .select({ puzzleId: games.puzzleId, finishedAt: games.finishedAt })
    .from(games)
    .where(eq(games.userId, userId));
  return new Map(rows.map((r) => [r.puzzleId, r.finishedAt ? "solved" : "playing"]));
}
