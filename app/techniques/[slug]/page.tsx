import Link from "next/link";
import { notFound } from "next/navigation";
import GridView, { stepMarks } from "@/components/GridView";
import { gameStatuses } from "@/lib/games";
import PuzzleLinks from "@/components/PuzzleLinks";
import { hintText } from "@/lib/sudoku/hint";
import { TIERS } from "@/lib/sudoku/solver";
import { exampleOf, getTechnique, listTechniques, puzzlesNeeding } from "@/lib/techniques";
import { currentUser } from "@/lib/user";

export default async function Technique({ params }: PageProps<"/techniques/[slug]">) {
  const { slug } = await params;
  const t = await getTechnique(slug);
  if (!t) notFound();
  const [all, example, practice, user] = await Promise.all([listTechniques(), exampleOf(slug), puzzlesNeeding(t.sort), currentUser()]);
  const status = user ? await gameStatuses(user.id) : new Map();
  const prev = all.find((x) => x.sort === t.sort - 1), next = all.find((x) => x.sort === t.sort + 1);
  const ex = example && { ...example, ...stepMarks(example.step) };

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

      {ex && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-medium">Example</h2>
          <div className="w-full max-w-[480px]">
            <GridView
              label={`${t.name} example`}
              values={ex.position.values}
              notes={(c) => ex.position.cands[c]}
              marks={ex.marks}
              look={(c) => ({ tone: ex.cells.has(c) ? "hint" : undefined, given: ex.givens[c] !== "0" })}
            />
          </div>
          <p className="text-sm">
            {hintText({ kind: "step", step: ex.step, position: ex.position }, 3, { values: ex.position.values, notes: [] })}{" "}
            <span className="text-zinc-500">
              Key candidates are in <span className="rounded bg-amber-300 px-1 text-amber-950">amber</span>, removals are{" "}
              <span className="font-bold text-red-600 line-through">struck out</span>. From{" "}
              <Link href={`/play/${ex.puzzleId}`} className="underline">puzzle {ex.puzzleId}</Link>.
            </span>
          </p>
        </section>
      )}

      {practice.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-medium">Practise</h2>
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
