/**
 * Everything `register` does, in a module the edge build never sees — it has no
 * `process.exit`. The schema the app assumes, and the content it serves, are in
 * place before it answers anything.
 *
 * Next keeps a failed register() and rethrows it on every request, so the
 * server never recovers by itself. After a reboot home-db can still be starting
 * when this runs; exiting lets Docker's restart policy try again.
 */
export async function startServer(): Promise<void> {
  try {
    const { runMigrations } = await import("../db");
    await runMigrations();
    const { seedPuzzles } = await import("./puzzles");
    await seedPuzzles();
    const { seedGuides } = await import("./guides");
    await seedGuides();
  } catch (err) {
    console.error("Startup failed; exiting so the container restarts.", err);
    process.exit(1);
  }
}
