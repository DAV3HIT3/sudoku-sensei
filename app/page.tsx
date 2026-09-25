import Link from "next/link";
import { listPuzzles } from "@/lib/puzzles";
import { currentUser } from "@/lib/user";

export default async function Home() {
  const user = await currentUser();
  const puzzles = await listPuzzles();
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-6">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Sudoku Sensei</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          {user ? `Welcome, ${user.displayName}.` : "Open this through the tailnet to play."}
        </p>
      </header>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {puzzles.map((p) => (
          <li key={p.id}>
            <Link href={`/play/${p.id}`} className="flex justify-between py-3 hover:underline">
              <span>{p.source}</span>
              <span className="text-zinc-500">{p.givens.replace(/0/g, "").length} givens</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
