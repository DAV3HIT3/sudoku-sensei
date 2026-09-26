import Link from "next/link";
import InfoLink from "@/components/InfoLink";
import NextCard from "@/components/NextCard";
import PuzzlePicker from "@/components/PuzzlePicker";
import { gameStatuses } from "@/lib/games";
import { training } from "@/lib/progress";
import { listPuzzles } from "@/lib/puzzles";
import { TECHNIQUES, TIER_LIST, TIERS } from "@/lib/sudoku/solver";
import { currentUser } from "@/lib/user";

export default async function Home() {
  const user = await currentUser();
  const puzzles = await listPuzzles();
  const status = user ? await gameStatuses(user.id) : new Map<number, "solved" | "playing">();
  // Grouped by the hardest technique each needs, easiest first (the list is sorted that way).
  const groups = Map.groupBy(puzzles, (p) => p.difficulty ?? -1);
  const plan = user ? await training(user.id) : null;
  // "X-Wing · puzzle 3": the name the picker below gives it.
  const label = (id: number) => {
    const p = puzzles.find((q) => q.id === id)!;
    const n = groups.get(p.difficulty ?? -1)!.indexOf(p) + 1;
    return `${p.difficulty === null ? "Beyond the lessons" : TECHNIQUES[p.difficulty].name} · puzzle ${n}`;
  };
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <nav className="flex justify-end gap-4 text-sm text-zinc-500">
          <Link href="/progress" className="hover:underline">Progress</Link>
          <Link href="/techniques" className="hover:underline">Techniques</Link>
          <Link href="/settings" className="hover:underline">Settings</Link>
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Sudoku Sensei</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          {user ? `Welcome, ${user.displayName}.` : "Open this through the tailnet to play."}
        </p>
      </header>
      {plan && (
        <NextCard
          next={plan.next}
          focus={plan.focus}
          daily={plan.daily}
          dailySolved={plan.dailySolved}
          names={Object.fromEntries(TECHNIQUES.map((t) => [t.slug, t.name]))}
          label={label}
        />
      )}
      <p className="text-sm text-zinc-500">Puzzles by the hardest technique they need, easiest first.</p>
      {[...TIER_LIST, 0].map((tier) => {
        // Every technique gets a row, puzzles or not; tier 0 is the puzzles beyond the catalog.
        const rows = tier
          ? TECHNIQUES.flatMap((t, sort) => (t.tier === tier ? [{ t, list: groups.get(sort) ?? [] }] : []))
          : groups.has(-1) ? [{ t: null, list: groups.get(-1)! }] : [];
        if (!rows.length) return null;
        return (
          <section key={tier} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">{tier ? TIERS[tier] : "Beyond the lessons"}</h2>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map(({ t, list }) => (
                <li key={t?.slug ?? "expert"} className="grid grid-cols-[minmax(0,1fr)_auto_4rem_5rem] items-center gap-2 py-2 sm:grid-cols-[minmax(0,1fr)_auto_5rem_6rem]">
                  <span className="flex min-w-0 items-center gap-1">
                    <span className="truncate text-sm font-medium sm:text-base">{t ? t.name : "Unsolved by the lessons"}</span>
                    <InfoLink href={t ? `/techniques/${t.slug}` : "/techniques"} label={t ? `About ${t.name}` : "About the techniques"} />
                  </span>
                  {list.length ? (
                    <PuzzlePicker label={t ? t.name : "Beyond the lessons"} puzzles={list.map((p) => ({ id: p.id, status: status.get(p.id) }))} />
                  ) : (
                    <>
                      <span className="col-span-2 text-right text-sm text-zinc-500">No puzzles yet</span>
                      <Link href={`/techniques/${t!.slug}#lesson`} className="rounded bg-sky-600 py-2 text-center text-sm text-white">Lesson</Link>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
