"use client";

import Link from "next/link";
import { useState } from "react";

type Status = "solved" | "playing" | undefined;

/**
 * One group's puzzles as "3 of 12 complete", a numbered dropdown (• in progress,
 * ✓ solved) and a button, laid out as the last three cells of the row its
 * parent starts. Starts on the game in
 * progress, else the first unsolved one, else the first.
 */
export default function PuzzlePicker({ label, puzzles }: { label: string; puzzles: { id: number; status: Status }[] }) {
  const solved = puzzles.filter((p) => p.status === "solved").length;
  const playing = puzzles.findIndex((p) => p.status === "playing");
  const [i, setI] = useState(playing >= 0 ? playing : Math.max(0, puzzles.findIndex((p) => p.status !== "solved")));
  const p = puzzles[i];
  return (
    <>
      <span className="text-right text-sm text-zinc-500 tabular-nums">
        <span className="sm:hidden">{solved}/{puzzles.length}</span>
        <span className="hidden sm:inline">{solved} of {puzzles.length} complete</span>
      </span>
      <select
        aria-label={`${label} puzzle`}
        value={i}
        onChange={(e) => setI(Number(e.target.value))}
        className="w-full rounded border border-zinc-300 bg-background px-1 py-2 text-sm dark:border-zinc-700"
      >
        {puzzles.map((q, n) => (
          <option key={q.id} value={n}>
            {n + 1}{q.status === "solved" ? " ✓" : q.status === "playing" ? " •" : ""}
          </option>
        ))}
      </select>
      <Link
        href={`/play/${p.id}`}
        className={`rounded py-2 text-center text-sm ${p.status === "solved" ? "bg-zinc-100 dark:bg-zinc-800" : "bg-sky-600 text-white"}`}
      >
        {p.status === "playing" ? "Continue" : p.status === "solved" ? "Replay" : "Play"}
      </Link>
    </>
  );
}
