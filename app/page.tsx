import Link from "next/link";
import InfoLink from "@/components/InfoLink";
import PuzzlePicker from "@/components/PuzzlePicker";
import { gameStatuses } from "@/lib/games";
import { listPuzzles } from "@/lib/puzzles";
import { TECHNIQUES, TIERS } from "@/lib/sudoku/solver";
import { currentUser } from "@/lib/user";

export default async function Home() {
  const user = await currentUser();
  const puzzles = await listPuzzles();
  const status = user ? await gameStatuses(user.id) : new Map<number, "solved" | "playing">();
  // Grouped by the hardest technique each needs, easiest first (the list is sorted that way).
  const groups = Map.groupBy(puzzles, (p) => p.difficulty ?? -1);
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Sudoku Sensei</h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            {user ? `Welcome, ${user.displayName}.` : "Open this through the tailnet to play."}
          </p>
        </div>
        <Link href="/techniques" className="mt-3 text-sm text-zinc-500 hover:underline">Techniques</Link>
      </header>
      <p className="text-sm text-zinc-500">Puzzles by the hardest technique they need, easiest first.</p>
      {[1, 2, 3, 0].map((tier) => {
        // Tier 0 collects the puzzles beyond the catalog.
        const rows = [...groups].filter(([d]) => (TECHNIQUES[d]?.tier ?? 0) === tier);
        if (!rows.length) return null;
        return (
          <section key={tier} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">{tier ? TIERS[tier] : "Expert"}</h2>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map(([difficulty, list]) => {
                const t = TECHNIQUES[difficulty];
                return (
                  <li key={difficulty} className="grid grid-cols-[minmax(0,1fr)_auto_4rem_5rem] items-center gap-2 py-2 sm:grid-cols-[minmax(0,1fr)_auto_5rem_6rem]">
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="truncate text-sm font-medium sm:text-base">{t ? t.name : "Beyond the lessons"}</span>
                      <InfoLink href={t ? `/techniques/${t.slug}` : "/techniques"} label={t ? `About ${t.name}` : "About the techniques"} />
                    </span>
                    <PuzzlePicker label={t ? t.name : "Expert"} puzzles={list.map((p) => ({ id: p.id, status: status.get(p.id) }))} />
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
