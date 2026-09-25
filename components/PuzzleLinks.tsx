import Link from "next/link";

/** Numbered links to puzzles, coloured by the player's progress on each. */
export default function PuzzleLinks({ ids, status }: { ids: number[]; status: Map<number, "solved" | "playing"> }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const s = status.get(id);
        return (
          <li key={id}>
            <Link
              href={`/play/${id}`}
              aria-label={`Puzzle ${id}${s === "solved" ? ", solved" : s === "playing" ? ", in progress" : ""}`}
              className={`flex h-10 min-w-10 items-center justify-center rounded px-2 text-sm tabular-nums ${
                s === "solved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : s === "playing" ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                  : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              }`}
            >
              {id}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
