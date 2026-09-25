import Link from "next/link";
import { gameStatuses } from "@/lib/games";
import { listPuzzles } from "@/lib/puzzles";
import { TECHNIQUES } from "@/lib/sudoku/solver";
import { currentUser } from "@/lib/user";

const TIERS = ["", "Easy", "Medium", "Hard"];

export default async function Home() {
  const user = await currentUser();
  const puzzles = await listPuzzles();
  const status = user ? await gameStatuses(user.id) : new Map();
  // Grouped by the hardest technique each needs, easiest first (the list is sorted that way).
  const groups = Map.groupBy(puzzles, (p) => p.difficulty ?? -1);
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Sudoku Sensei</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          {user ? `Welcome, ${user.displayName}.` : "Open this through the tailnet to play."}
        </p>
      </header>
      <p className="text-sm text-zinc-500">
        Puzzles by the hardest technique they need. <span className="text-sky-700 dark:text-sky-300">Blue</span> is in progress,{" "}
        <span className="text-emerald-700 dark:text-emerald-400">green</span> is solved.
      </p>
      {[...groups].map(([difficulty, list]) => {
        const t = TECHNIQUES[difficulty];
        return (
          <section key={difficulty} className="flex flex-col gap-2">
            <h2 className="flex items-baseline justify-between font-medium">
              {t ? t.name : "Beyond the lessons"}
              <span className="text-sm font-normal text-zinc-500">{t ? TIERS[t.tier] : "Expert"}</span>
            </h2>
            <ul className="flex flex-wrap gap-2">
              {list.map((p) => {
                const s = status.get(p.id);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/play/${p.id}`}
                      title={p.source}
                      aria-label={`Puzzle ${p.id}${s === "solved" ? ", solved" : s === "playing" ? ", in progress" : ""}`}
                      className={`flex h-10 min-w-10 items-center justify-center rounded px-2 text-sm tabular-nums ${
                        s === "solved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : s === "playing" ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                          : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {p.id}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
