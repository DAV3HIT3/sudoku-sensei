import Link from "next/link";
import { TIERS } from "@/lib/sudoku/solver";
import { listTechniques } from "@/lib/techniques";

export default async function Techniques() {
  const all = await listTechniques();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">← Puzzles</Link>
      <h1 className="text-3xl font-semibold tracking-tight">Techniques</h1>
      <p className="text-zinc-600 dark:text-zinc-400">In the order the solver tries them, easiest first. Each hint names one of these.</p>
      {[1, 2, 3].map((tier) => (
        <section key={tier} className="flex flex-col gap-3">
          <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">{TIERS[tier]}</h2>
          <ul className="flex flex-col gap-3">
            {all.filter((t) => t.tier === tier).map((t) => (
              <li key={t.slug}>
                <Link href={`/techniques/${t.slug}`} className="font-medium hover:underline">{t.name}</Link>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
