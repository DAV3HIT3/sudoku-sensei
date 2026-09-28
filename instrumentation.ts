// Runs once as the server starts, before it answers anything: the schema the app
// assumes, and the content it serves, are in place first.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { runMigrations } = await import("./db");
    await runMigrations();
    const { seedPuzzles } = await import("./lib/puzzles");
    await seedPuzzles();
    const { seedGuides } = await import("./lib/guides");
    await seedGuides();
  } catch (err) {
    // Next keeps a failed register() and rethrows it on every request, so the
    // server never recovers by itself. After a reboot home-db can still be
    // starting when this runs; exiting lets Docker's restart policy try again.
    console.error("Startup failed; exiting so the container restarts.", err);
    process.exit(1);
  }
}
