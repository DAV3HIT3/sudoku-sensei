import { count } from "drizzle-orm";
import { getDb } from "@/db";
import { puzzles } from "@/db/schema";
import { health } from "@/lib/health";

/**
 * The container's health check (deploy/compose.yml) and bin/deploy's. No identity:
 * Docker's probe runs inside the container on 127.0.0.1, not through the sidecar.
 */
export async function GET() {
  return health(async () => (await getDb().select({ n: count() }).from(puzzles))[0].n);
}
