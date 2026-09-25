import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { games, type GameState } from "@/db/schema";
import { getPuzzle } from "@/lib/puzzles";
import { boardOf } from "@/lib/sudoku/grid";

export type SavedGame = { state: GameState; updatedAt: number };

export async function getGame(userId: number, puzzleId: number): Promise<SavedGame | null> {
  const [g] = await getDb()
    .select({ state: games.state, updatedAt: games.updatedAt })
    .from(games)
    .where(and(eq(games.userId, userId), eq(games.puzzleId, puzzleId)));
  return g ? { state: g.state, updatedAt: g.updatedAt.getTime() } : null;
}

/**
 * Stores a board sent by the browser, after checking it is a board of this puzzle.
 * Last write wins: two devices playing the same puzzle at the same moment
 * overwrite each other, which is fine for one person moving between devices.
 */
export async function saveGame(userId: number, puzzleId: number, state: unknown): Promise<SavedGame> {
  const puzzle = await getPuzzle(puzzleId);
  if (!puzzle) throw new Error("no such puzzle");
  const clean = boardOf(puzzle.givens, state);
  if (!clean) throw new Error("not a board of this puzzle");
  const solved = clean.values === puzzle.solution;
  const [g] = await getDb()
    .insert(games)
    .values({ userId, puzzleId, state: clean, finishedAt: solved ? new Date() : null })
    .onConflictDoUpdate({
      target: [games.userId, games.puzzleId],
      set: {
        state: clean,
        updatedAt: sql`now()`,
        // Keeps the first finish; a restart (unsolved again) clears it.
        finishedAt: solved ? sql`coalesce(${games.finishedAt}, now())` : null,
      },
    })
    .returning({ updatedAt: games.updatedAt });
  return { state: clean, updatedAt: g.updatedAt.getTime() };
}

/** Each puzzle this player has touched: solved or still in progress. */
export async function gameStatuses(userId: number): Promise<Map<number, "solved" | "playing">> {
  const rows = await getDb()
    .select({ puzzleId: games.puzzleId, finishedAt: games.finishedAt })
    .from(games)
    .where(eq(games.userId, userId));
  return new Map(rows.map((r) => [r.puzzleId, r.finishedAt ? "solved" : "playing"]));
}
