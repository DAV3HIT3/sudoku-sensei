import Link from "next/link";
import { notFound } from "next/navigation";
import Prose from "@/components/Prose";
import { getGuide, listGuides } from "@/lib/guides";

export default async function Guide({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const [g, all] = await Promise.all([getGuide(slug), listGuides()]);
  if (!g) notFound();
  const i = all.findIndex((x) => x.slug === slug);
  const prev = all[i - 1], next = all[i + 1];
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <nav className="flex justify-between text-sm text-zinc-500">
        <Link href="/" className="hover:underline">← Puzzles</Link>
        <Link href="/techniques" className="hover:underline">Techniques and guides</Link>
      </nav>
      <header>
        <p className="text-sm text-zinc-500">Guide</p>
        <h1 className="text-3xl font-semibold tracking-tight">{g.title}</h1>
      </header>
      <Prose text={g.body} />
      <nav className="flex justify-between border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
        {prev ? <Link href={`/guides/${prev.slug}`} className="hover:underline">← {prev.title}</Link> : <span />}
        {next ? <Link href={`/guides/${next.slug}`} className="hover:underline">{next.title} →</Link> : <Link href="/techniques/simple-coloring" className="hover:underline">Simple Coloring →</Link>}
      </nav>
    </main>
  );
}
