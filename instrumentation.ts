// Runs once as the server starts, before it answers anything.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startServer } = await import("./lib/startup");
  await startServer();
}
