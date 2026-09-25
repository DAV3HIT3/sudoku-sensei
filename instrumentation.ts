// Runs once as the server starts, before it answers anything: the schema the app
// assumes, and the content it serves, are in place first.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { runMigrations } = await import("./db");
  await runMigrations();
  const { seedPuzzles } = await import("./lib/puzzles");
  await seedPuzzles();
}
