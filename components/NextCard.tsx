import Link from "next/link";
import type { Next } from "@/lib/mastery";

/**
 * The one thing to do next, as a card with a button. `label` names a puzzle the
 * way the home page does ("X-Wing · puzzle 3").
 */
export default function NextCard({ next, focus, daily, dailySolved, names, label }: {
  next: Next; focus: Next; daily: number; dailySolved: boolean;
  names: Record<string, string>; label: (puzzleId: number) => string;
}) {
  const card = describe(next, names, label);
  const other = next.kind === "continue" && focus.kind !== "daily" ? describe(focus, names, label) : null;
  return (
    <section aria-label="Next" className="flex flex-col gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/40">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-sky-700 uppercase dark:text-sky-300">Next</p>
          <p className="font-medium">{card.title}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{card.detail}</p>
        </div>
        <Link href={card.href} className="shrink-0 rounded bg-sky-600 px-4 py-2 text-white">{card.button}</Link>
      </div>
      {other && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Or: <Link href={other.href} className="underline">{other.title[0].toLowerCase() + other.title.slice(1)}</Link>.
        </p>
      )}
      {next.kind !== "daily" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Today&apos;s puzzle: <Link href={`/play/${daily}`} className="underline">{label(daily)}</Link>{dailySolved ? " ✓" : ""}
        </p>
      )}
    </section>
  );
}

function describe(n: Next, names: Record<string, string>, label: (id: number) => string) {
  switch (n.kind) {
    case "continue":
      return { title: `Continue ${label(n.puzzleId)}`, detail: "Your game in progress.", href: `/play/${n.puzzleId}`, button: "Continue" };
    case "lesson":
      return { title: `Learn the ${names[n.technique]}`, detail: "The next technique to master. Start with its lesson.", href: `/techniques/${n.technique}#lesson`, button: "Lesson" };
    case "drills":
      return { title: `Practise the ${names[n.technique]}`, detail: "Get four of your last five drills right to master it.", href: `/techniques/${n.technique}/drill`, button: "Drills" };
    case "puzzle":
      return { title: `Use the ${names[n.technique]} in a puzzle`, detail: `${label(n.puzzleId)}. Solving it without a full hint counts toward mastery.`, href: `/play/${n.puzzleId}`, button: "Play" };
    case "daily":
      return { title: "Today's puzzle", detail: `${label(n.puzzleId)}. Every technique so far is mastered.`, href: `/play/${n.puzzleId}`, button: "Play" };
  }
}
