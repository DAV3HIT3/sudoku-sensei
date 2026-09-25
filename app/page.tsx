import { currentUser } from "@/lib/user";

export default async function Home() {
  const user = await currentUser();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Sudoku Sensei</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        {user ? `Welcome, ${user.displayName}.` : "Open this through the tailnet to play."}
      </p>
    </main>
  );
}
