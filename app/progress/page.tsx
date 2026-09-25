import Link from "next/link";
import { notFound } from "next/navigation";
import { MASTERED } from "@/lib/mastery";
import { training } from "@/lib/progress";
import { TIER_LIST, TIERS } from "@/lib/sudoku/solver";
import { currentUser } from "@/lib/user";

export default async function Progress() {
  const user = await currentUser();
  if (!user) notFound();
  const { techniques } = await training(user.id);
  const mastered = techniques.filter((t) => t.mastery >= MASTERED).length;
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">← Puzzles</Link>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Progress</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{mastered} of {techniques.length} techniques mastered.</p>
      </header>
      <p className="text-sm text-zinc-500">
        Mastery comes from your last five drills or from solving puzzles that need the technique without a full hint,
        whichever is better. Hints take some away, and it fades after two weeks without practice. 80% is mastered.
      </p>
      {TIER_LIST.map((tier) => (
        <section key={tier} className="flex flex-col gap-2">
          <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">{TIERS[tier]}</h2>
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {techniques.filter((t) => t.tier === tier).map((t) => {
              const pct = Math.round(t.mastery * 100);
              const right = t.evidence.drills.slice(0, 5).filter((d) => d.correct).length;
              return (
                <li key={t.slug} className="flex flex-col gap-1 py-3">
                  <div className="flex items-baseline gap-2">
                    <Link href={`/techniques/${t.slug}`} className="min-w-0 flex-1 truncate font-medium hover:underline">{t.name}</Link>
                    <span className={`text-sm tabular-nums ${t.mastery >= MASTERED ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-500"}`}>
                      {t.mastery >= MASTERED ? "Mastered · " : ""}{pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800" role="progressbar" aria-label={`${t.name} mastery`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`h-full ${t.mastery >= MASTERED ? "bg-emerald-500" : "bg-sky-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-zinc-500">
                    {[
                      t.lessonDone ? "lesson done" : "lesson not started",
                      t.evidence.drills.length ? `${right} of last ${Math.min(5, t.evidence.drills.length)} drills right` : "no drills yet",
                      t.evidence.cleanSolves ? `${t.evidence.cleanSolves} clean solve${t.evidence.cleanSolves > 1 ? "s" : ""}` : null,
                      t.evidence.hints.length ? `${t.evidence.hints.length} hint${t.evidence.hints.length > 1 ? "s" : ""} this month` : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
