"use client";

import Link from "next/link";
import { useState } from "react";
import GridView, { stepMarks, type Mark } from "@/components/GridView";
import { actionText } from "@/lib/sudoku/hint";
import type { DrillView } from "@/lib/techniques";
import { saveStage } from "./actions";

/**
 * A technique's lesson: each worked example in three stages (find it, see the
 * pattern, see what it removes), then an invitation to the drills. The stage
 * reached is saved, so the lesson resumes where it was left on any device.
 */
export default function Lesson({ slug, name, examples, initialStage }: {
  slug: string; name: string; examples: DrillView[]; initialStage: number;
}) {
  const end = examples.length * 3;
  const [stage, setStage] = useState(Math.min(initialStage, end));
  const go = (s: number) => {
    setStage(s);
    saveStage(slug, s, s === end).catch(() => {});
  };

  if (stage === end)
    return (
      <div className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
        <p>That is the {name}. Now find some yourself.</p>
        <div className="flex gap-3">
          <Link href={`/techniques/${slug}/drill`} className="rounded bg-sky-600 px-4 py-2 text-white">Practise</Link>
          <button type="button" onClick={() => go(0)} className="rounded px-4 py-2 hover:underline">Start the lesson again</button>
        </div>
      </div>
    );

  const ex = examples[Math.floor(stage / 3)];
  const part = stage % 3;
  const { cells, marks, links } = stepMarks(ex.step);
  // Stage 2 draws the pattern itself: both colour groups, even where stage 3 will strike them out.
  const pattern = new Map<string, Mark>([
    ...ex.step.highlight.candidates.map((c): [string, Mark] => [`${c.cell}:${c.digit}`, "key"]),
    ...(ex.step.highlight.others ?? []).map((c): [string, Mark] => [`${c.cell}:${c.digit}`, "key2"]),
  ]);
  const shownMarks = part === 0 ? new Map<string, Mark>() : part === 1 ? pattern : marks;
  const text = [
    `There is a ${name} here. Look for it, then press Next.`,
    ex.step.why,
    `${ex.step.why} So ${actionText(ex.step)}.`,
  ][part];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-500">Example {Math.floor(stage / 3) + 1} of {examples.length}</p>
      <div className="w-full max-w-[480px]">
        <GridView
          label={`${name} example ${Math.floor(stage / 3) + 1}`}
          values={ex.position.values}
          notes={(c) => ex.position.cands[c]}
          marks={shownMarks}
          links={part > 0 ? links : []}
          look={(c) => ({
            // The pattern's cells from stage 2, and the cells it changes as well at stage 3.
            tone: (part === 1 ? ex.step.highlight.cells.includes(c) : part === 2 && cells.has(c)) ? "hint" : undefined,
            given: ex.givens[c] !== "0",
          })}
        />
      </div>
      <p aria-live="polite" className="min-h-12">{text}</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => go(stage - 1)} disabled={stage === 0} className="rounded bg-zinc-100 px-4 py-2 disabled:opacity-40 dark:bg-zinc-800">Back</button>
        <button type="button" onClick={() => go(stage + 1)} className="rounded bg-sky-600 px-4 py-2 text-white">Next</button>
      </div>
    </div>
  );
}
