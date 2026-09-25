"use client";

import { useCallback, useEffect, useState } from "react";
import GridView, { stepMarks, type Mark } from "@/components/GridView";
import { placesDigits, type Verdict } from "@/lib/sudoku/drill";
import { actionText } from "@/lib/sudoku/hint";
import type { Candidate } from "@/lib/sudoku/solver";
import type { DrillView } from "@/lib/techniques";
import { answerDrill, getNextDrill } from "../actions";

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * "Find the X-Wing here." For the singles the answer is a digit placed in a cell;
 * for everything else it is one or more candidates marked for removal. The server
 * checks it and says why.
 */
export default function Drill({ slug, name, first, stats }: {
  slug: string; name: string; first: DrillView; stats: { tried: number; right: number };
}) {
  const [drill, setDrill] = useState(first);
  const [score, setScore] = useState(stats);
  const [selected, setSelected] = useState(-1);
  const [place, setPlace] = useState<Candidate | null>(null);
  const [remove, setRemove] = useState<Candidate[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);
  const placing = placesDigits(drill.step);
  const { position } = drill;

  const pick = useCallback((d: number) => {
    if (verdict || selected < 0 || position.values[selected]) return;
    if (placing) setPlace({ cell: selected, digit: d });
    else if (position.cands[selected] & (1 << d))
      setRemove((r) => r.some((x) => x.cell === selected && x.digit === d)
        ? r.filter((x) => !(x.cell === selected && x.digit === d))
        : [...r, { cell: selected, digit: d }]);
  }, [verdict, selected, placing, position]);

  const submit = async (giveUp = false) => {
    setBusy(true);
    try {
      const v = await answerDrill(drill.id, giveUp ? { place: null, remove: [] } : { place, remove });
      setVerdict(v);
      setScore((s) => ({ tried: s.tried + 1, right: s.right + (v.correct ? 1 : 0) }));
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    setBusy(true);
    try {
      const d = await getNextDrill(slug, drill.id);
      if (d) setDrill(d);
      setSelected(-1); setPlace(null); setRemove([]); setVerdict(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
      if (m && !e.metaKey && !e.ctrlKey) { e.preventDefault(); pick(Number(m[1])); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pick]);

  // Before checking: the player's answer. After: the step, as the lesson draws it.
  const shown = verdict ? stepMarks(verdict.step) : null;
  const marks = shown ? shown.marks : new Map<string, Mark>(remove.map((r) => [`${r.cell}:${r.digit}`, "remove"]));
  const values = place && !verdict ? position.values.map((v, c) => (c === place.cell ? place.digit : v)) : position.values;
  const answered = placing ? place !== null : remove.length > 0;

  return (
    <div className="flex w-full max-w-[540px] flex-col gap-4">
      <p className="text-sm">
        {placing
          ? `Find the ${name}: select the cell and choose its digit.`
          : `Find the ${name}: select a cell and tap a digit to mark that candidate for removal. Mark one or more, then check.`}
      </p>
      <GridView
        label={`${name} drill`}
        values={values}
        notes={(c) => position.cands[c]}
        marks={marks}
        onSelect={setSelected}
        look={(c) => ({
          tone: c === selected && !verdict ? "selected" : shown?.cells.has(c) ? "hint" : undefined,
          given: drill.givens[c] !== "0",
        })}
      />
      {verdict ? (
        <div role="status" className={`flex flex-col gap-2 rounded border p-3 text-sm ${verdict.correct
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50"
          : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50"}`}>
          <p className="font-medium">{verdict.correct ? "Right." : "Not quite. Here is one:"}</p>
          <p>{verdict.step.why} So {actionText(verdict.step)}.</p>
          <button type="button" onClick={next} disabled={busy} className="self-start rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-50">Next drill</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-9 gap-1">
            {DIGITS.map((d) => (
              <button key={d} type="button" onClick={() => pick(d)} className="aspect-square rounded bg-zinc-100 text-2xl hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">{d}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => submit()} disabled={!answered || busy} className="rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-40">Check</button>
            {!placing && remove.length > 0 && (
              <button type="button" onClick={() => setRemove([])} className="rounded bg-zinc-100 px-4 py-2 dark:bg-zinc-800">Clear</button>
            )}
            <button type="button" onClick={() => submit(true)} disabled={busy} className="ml-auto rounded px-4 py-2 hover:underline">Show me</button>
          </div>
        </>
      )}
      <p className="text-sm text-zinc-500">{score.right} of {score.tried} {name} drills right so far.</p>
    </div>
  );
}
