"use client";

import Link from "next/link";
import { useState } from "react";

type Status = "solved" | "playing" | undefined;

/**
 * One group's puzzles as "3 of 12 complete", a numbered dropdown and a button.
 * Starts on the game in progress, else the first unsolved one, else the first.
 */
export default function PuzzlePicker({ label, puzzles }: { label: string; puzzles: { id: number; status: Status }[] }) {
  const solved = puzzles.filter((p) => p.status === "solved").length;
  const playing = puzzles.findIndex((p) => p.status === "playing");
  const [i, setI] = useState(playing >= 0 ? playing : Math.max(0, puzzles.findIndex((p) => p.status !== "solved")));
  const p = puzzles[i];
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-sm text-zinc-500 tabular-nums">{solved} of {puzzles.length} complete</span>
      <select
        aria-label={`${label} puzzle`}
        value={i}
        onChange={(e) => setI(Number(e.target.value))}
        className="rounded border border-zinc-300 bg-background px-2 py-2 text-sm dark:border-zinc-700"
      >
        {puzzles.map((q, n) => (
          <option key={q.id} value={n}>
            {n + 1}{q.status === "solved" ? " ✓" : q.status === "playing" ? " · playing" : ""}
          </option>
        ))}
      </select>
      <Link
        href={`/play/${p.id}`}
        className={`w-24 shrink-0 rounded px-3 py-2 text-center text-sm ${p.status === "solved" ? "bg-zinc-100 dark:bg-zinc-800" : "bg-sky-600 text-white"}`}
      >
        {p.status === "playing" ? "Continue" : p.status === "solved" ? "Play again" : "Play"}
      </Link>
    </div>
  );
}
