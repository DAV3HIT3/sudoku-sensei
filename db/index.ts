import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// On globalThis, not a module-level `let`: Next can load a module more than once
// in one server, and each copy would open a pool of its own.
const cache = globalThis as unknown as { _senseiDb?: Db };

export function getDb(): Db {
  if (cache._senseiDb) return cache._senseiDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
  cache._senseiDb = drizzle(postgres(url, { max: 4, onnotice: () => {} }), { schema });
  return cache._senseiDb;
}

export async function runMigrations(): Promise<void> {
  await migrate(getDb(), { migrationsFolder: path.join(process.cwd(), "db", "migrations") });
}
