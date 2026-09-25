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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
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
      {[...groups].map(([difficulty, list]) => {
        const t = TECHNIQUES[difficulty];
        return (
          <section key={difficulty} className="flex flex-col gap-2">
            <h2 className="flex items-center gap-1 font-medium">
              {t ? t.name : "Beyond the lessons"}
              <InfoLink href={t ? `/techniques/${t.slug}` : "/techniques"} label={t ? `About ${t.name}` : "About the techniques"} />
              <span className="ml-auto text-sm font-normal text-zinc-500">{t ? TIERS[t.tier] : "Expert"}</span>
            </h2>
            <PuzzlePicker label={t ? t.name : "Expert"} puzzles={list.map((p) => ({ id: p.id, status: status.get(p.id) }))} />
          </section>
        );
      })}
    </main>
  );
}
