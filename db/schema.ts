import { sql } from "drizzle-orm";
import { char, integer, jsonb, pgTable, primaryKey, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import type { Position, Step } from "@/lib/sudoku/solver";

/**
 * A player. Holds nothing about how they sign in: that is `identities`, so a
 * player can gain a password or an OAuth login later without their progress
 * moving. Everything else in the app references users.id and nothing else.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One way of signing in, for one user. `provider` is who vouches for `subject`:
 * "tailscale" (subject: Tailscale-User-Login) today; later "password" (subject:
 * the email; its hash gets a column then) or an OAuth provider (subject: its user id).
 */
export const identities = pgTable(
  "identities",
  {
    provider: text("provider").notNull(),
    subject: text("subject").notNull(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.subject] })],
);

/**
 * The solving techniques, in the order the solver tries them (lib/sudoku/solver.ts
 * is the source; copied here on start-up so content and progress can refer to them).
 */
export const techniques = pgTable("techniques", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  tier: integer("tier").notNull(),
  sort: integer("sort").notNull(),
});

/** Puzzles to play. Seeded and graded from content/puzzles.txt on start-up (lib/puzzles.ts). */
export const puzzles = pgTable("puzzles", {
  id: serial("id").primaryKey(),
  /** 81 digits, row by row, 0 for empty. */
  givens: char("givens", { length: 81 }).notNull().unique(),
  solution: char("solution", { length: 81 }).notNull(),
  source: text("source").notNull(),
  /** techniques.sort of the hardest technique needed; null when the catalog cannot solve it. */
  difficulty: integer("difficulty"),
  /** Slugs of every technique the solver used, easiest first. */
  techniques: text("techniques").array().notNull().default(sql`'{}'`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * "Find the X-Wing here": the position just before a puzzle first needs a
 * technique, and the step the solver took. One per puzzle per technique.
 */
export const drills = pgTable(
  "drills",
  {
    id: serial("id").primaryKey(),
    puzzleId: integer("puzzle_id").notNull().references(() => puzzles.id, { onDelete: "cascade" }),
    technique: text("technique").notNull().references(() => techniques.slug),
    position: jsonb("position").$type<Position>().notNull(),
    step: jsonb("step").$type<Step>().notNull(),
  },
  (t) => [unique().on(t.puzzleId, t.technique)],
);

/**
 * A player's game of one puzzle: one per player per puzzle, saved as they play,
 * so it resumes on any device. Restarting overwrites it.
 */
export const games = pgTable(
  "games",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    puzzleId: integer("puzzle_id").notNull().references(() => puzzles.id, { onDelete: "cascade" }),
    /** The board: 81 digits (0 empty) and each cell's pencil marks as a bitmask (bit d = digit d). */
    state: jsonb("state").$type<GameState>().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    /** When the board first matched the solution. */
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [unique().on(t.userId, t.puzzleId)],
);

export type GameState = { values: string; notes: number[] };
