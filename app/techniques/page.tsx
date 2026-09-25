import Link from "next/link";
import { connection } from "next/server";
import { drillStats, lessonsDone } from "@/lib/progress";
import { TIER_LIST, TIERS } from "@/lib/sudoku/solver";
import { listGuides } from "@/lib/guides";
import { listTechniques } from "@/lib/techniques";
import { currentUser } from "@/lib/user";

export default async function Techniques() {
  await connection(); // read from the database per request, not frozen at build time
  const [all, guides, user] = await Promise.all([listTechniques(), listGuides(), currentUser()]);
  const [done, stats] = user ? await Promise.all([lessonsDone(user.id), drillStats(user.id)]) : [new Set<string>(), new Map()];
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">← Puzzles</Link>
      <h1 className="text-3xl font-semibold tracking-tight">Techniques</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Start with the guides on notes and coloring. The techniques follow in the order the solver tries them, easiest
        first; each hint names one of them.
      </p>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">Guides</h2>
        <ul className="flex flex-col gap-3">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="font-medium hover:underline">{g.title}</Link>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{g.summary}</p>
            </li>
          ))}
        </ul>
      </section>
      {TIER_LIST.map((tier) => (
        <section key={tier} className="flex flex-col gap-3">
          <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">{TIERS[tier]}</h2>
          <ul className="flex flex-col gap-3">
            {all.filter((t) => t.tier === tier).map((t) => (
              <li key={t.slug}>
                <div className="flex items-baseline gap-3">
                  <Link href={`/techniques/${t.slug}`} className="font-medium hover:underline">{t.name}</Link>
                  <span className="text-xs text-zinc-500">
                    {[done.has(t.slug) && "lesson done", stats.get(t.slug) && `${stats.get(t.slug).right} of ${stats.get(t.slug).tried} drills right`].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
