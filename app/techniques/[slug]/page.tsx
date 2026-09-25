import Link from "next/link";
import { notFound } from "next/navigation";
import PuzzleLinks from "@/components/PuzzleLinks";
import { gameStatuses } from "@/lib/games";
import { drillStats, lessonStage } from "@/lib/progress";
import { TIERS } from "@/lib/sudoku/solver";
import { examplesOf, getTechnique, listTechniques, puzzlesNeeding } from "@/lib/techniques";
import { currentUser } from "@/lib/user";
import Lesson from "./Lesson";

export default async function Technique({ params }: PageProps<"/techniques/[slug]">) {
  const { slug } = await params;
  const t = await getTechnique(slug);
  if (!t) notFound();
  const [all, examples, practice, user] = await Promise.all([listTechniques(), examplesOf(slug), puzzlesNeeding(t.sort), currentUser()]);
  const [status, lesson, stats] = user
    ? await Promise.all([gameStatuses(user.id), lessonStage(user.id, slug), drillStats(user.id, slug)])
    : [new Map<number, "solved" | "playing">(), { stage: 0, done: false }, new Map()];
  const score = stats.get(slug);
  const prev = all.find((x) => x.sort === t.sort - 1), next = all.find((x) => x.sort === t.sort + 1);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <nav className="flex justify-between text-sm text-zinc-500">
        <Link href="/" className="hover:underline">← Puzzles</Link>
        <Link href="/techniques" className="hover:underline">All techniques</Link>
      </nav>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{t.name}</h1>
        <p className="text-sm text-zinc-500">{TIERS[t.tier]}</p>
      </header>
      <div className="flex flex-col gap-3 leading-relaxed">
        {t.body.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
      </div>

      {examples.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-baseline justify-between text-xl font-medium">
            Lesson
            {lesson.done && <span className="text-sm font-normal text-emerald-700 dark:text-emerald-400">Finished</span>}
          </h2>
          <p className="text-sm text-zinc-500">
            Key candidates are in <span className="rounded bg-amber-300 px-1 text-amber-950">amber</span>, removals are{" "}
            <span className="font-bold text-red-600 line-through">struck out</span>.
          </p>
          <Lesson slug={slug} name={t.name} examples={examples} initialStage={lesson.stage} />
        </section>
      )}

      {examples.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-medium">Drills</h2>
          <p className="text-sm text-zinc-500">
            Positions from real puzzles where the {t.name} is the next step.
            {score ? ` You have ${score.right} of ${score.tried} right.` : ""}
          </p>
          <Link href={`/techniques/${slug}/drill`} className="self-start rounded bg-sky-600 px-4 py-2 text-white">Practise</Link>
        </section>
      )}

      {practice.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-medium">Puzzles</h2>
          <p className="text-sm text-zinc-500">Puzzles where this is the hardest step.</p>
          <PuzzleLinks ids={practice.map((p) => p.id)} status={status} />
        </section>
      )}

      <nav className="flex justify-between border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
        {prev ? <Link href={`/techniques/${prev.slug}`} className="hover:underline">← {prev.name}</Link> : <span />}
        {next ? <Link href={`/techniques/${next.slug}`} className="hover:underline">{next.name} →</Link> : <span />}
      </nav>
    </main>
  );
}
