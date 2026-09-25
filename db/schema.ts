import { integer, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";

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
