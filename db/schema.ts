import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/** One row per tailnet login, created on its first request. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  /** Tailscale-User-Login, e.g. someone@github. The identity; never shown. */
  tsLogin: text("ts_login").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
