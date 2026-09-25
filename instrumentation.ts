// Runs once as the server starts, before it answers anything: the schema the app
// assumes is in place first.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { runMigrations } = await import("./db");
  await runMigrations();
}
