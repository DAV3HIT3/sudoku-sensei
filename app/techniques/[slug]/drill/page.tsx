import Link from "next/link";
import { notFound } from "next/navigation";
import { drillStats } from "@/lib/progress";
import { getTechnique, nextDrill } from "@/lib/techniques";
import { currentUser } from "@/lib/user";
import Drill from "./Drill";

export default async function DrillPage({ params }: PageProps<"/techniques/[slug]/drill">) {
  const { slug } = await params;
  const [t, user] = await Promise.all([getTechnique(slug), currentUser()]);
  if (!t || !user) notFound();
  const [first, stats] = await Promise.all([nextDrill(user.id, slug), drillStats(user.id, slug)]);
  return (
    <main className="flex flex-1 flex-col items-center gap-4 p-4">
      <header className="flex w-full max-w-[540px] items-baseline justify-between">
        <Link href={`/techniques/${slug}`} className="text-sm text-zinc-500 hover:underline">← {t.name}</Link>
        <h1 className="font-medium">{t.name} drills</h1>
      </header>
      {first ? (
        <Drill slug={slug} name={t.name} first={first} stats={stats.get(slug) ?? { tried: 0, right: 0 }} coloring={t.tier >= 4} />
      ) : (
        <p>No drills for this technique yet.</p>
      )}
    </main>
  );
}
