/**
 * What /api/health answers, in the shape the monster runbook asks of every app
 * (its "Health checks" section). The app needs only its database, with the
 * puzzles seeded into it: without them there is nothing to play, so either one
 * missing is `down` and a 503. Pure apart from the probe it is handed, so the
 * test can give it a failing one.
 */
export type Status = "ok" | "degraded" | "down";
export type Check = { status: Status; ms: number; detail?: string };

const started = new Date(Date.now() - process.uptime() * 1000).toISOString();

/** Docker gives the whole probe 5 s; a stuck database answers well inside that. */
const TIMEOUT_MS = 3000;

/** The database check: `countPuzzles` runs a real query and resolves to the count. */
export async function health(countPuzzles: () => Promise<number>, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const t0 = performance.now();
  let timer: NodeJS.Timeout | undefined;
  let db: Omit<Check, "ms">;
  try {
    const n = await Promise.race([
      countPuzzles(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`no answer in ${timeoutMs} ms`)), timeoutMs);
      }),
    ]);
    db = n > 0 ? { status: "ok", detail: `${n} puzzles` } : { status: "down", detail: "no puzzles seeded" };
  } catch (err) {
    // One line, for a person reading `docker inspect`; postgres.js errors carry no password.
    db = { status: "down", detail: (err instanceof Error ? err.message : String(err)).split("\n")[0].slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
  const body = {
    status: db.status,
    version: process.env.APP_BUILD ?? "dev",
    commit: process.env.APP_COMMIT || null,
    started,
    checks: { db: { ...db, ms: Math.round(performance.now() - t0) } },
  };
  return Response.json(body, { status: body.status === "down" ? 503 : 200 });
}
