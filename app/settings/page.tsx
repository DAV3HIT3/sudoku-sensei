import Link from "next/link";
import { notFound } from "next/navigation";
import pkg from "@/package.json";
import { gameStatuses } from "@/lib/games";
import { MASTERED } from "@/lib/mastery";
import { drillStats, lessonsDone, training } from "@/lib/progress";
import { identitiesOf, currentUser } from "@/lib/user";

const PROVIDERS: Record<string, string> = { tailscale: "Tailscale" };
const date = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Denver" });

function Rows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[11rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-zinc-500">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function Settings() {
  const user = await currentUser();
  if (!user) notFound();
  const [ids, games, drills, lessons, plan] = await Promise.all([
    identitiesOf(user.id), gameStatuses(user.id), drillStats(user.id), lessonsDone(user.id), training(user.id),
  ]);
  const count = (s: string) => [...games.values()].filter((x) => x === s).length;
  const tried = [...drills.values()].reduce((n, d) => n + d.tried, 0);
  const right = [...drills.values()].reduce((n, d) => n + d.right, 0);
  const build = process.env.APP_BUILD ?? "development";
  const released = process.env.RELEASE_DATE ? date(new Date(process.env.RELEASE_DATE)) : "not released (development)";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-4 sm:p-6">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">← Puzzles</Link>
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">Account</h2>
        <Rows rows={[
          ["Name", user.displayName],
          ...ids.map((i): [string, React.ReactNode] => [`Signed in with ${PROVIDERS[i.provider] ?? i.provider}`, i.subject]),
          ["Member since", date(user.createdAt)],
        ]} />
        <p className="text-xs text-zinc-500">Your name and sign-in come from your Tailscale account.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">Your activity</h2>
        <Rows rows={[
          ["Puzzles solved", count("solved")],
          ["In progress", count("playing")],
          ["Drills", tried ? `${right} of ${tried} right` : "none yet"],
          ["Lessons finished", `${lessons.size} of ${plan.techniques.length}`],
          ["Techniques mastered", <Link key="m" href="/progress" className="underline">{plan.techniques.filter((t) => t.mastery >= MASTERED).length} of {plan.techniques.length}</Link>],
        ]} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">About</h2>
        <Rows rows={[
          ["Version", pkg.version],
          ["Build", build],
          ["Released", released],
        ]} />
      </section>
    </main>
  );
}
