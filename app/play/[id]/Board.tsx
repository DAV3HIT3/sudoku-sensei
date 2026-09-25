"use client";

import { useCallback, useEffect, useState } from "react";
import { box, candidates, col, conflicts, PEERS, row } from "@/lib/sudoku/grid";

/** What undo steps through: every value and every pencil mark (bitmask per cell). */
type Snapshot = { values: number[]; notes: number[] };
type History = { past: Snapshot[]; present: Snapshot; future: Snapshot[] };

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const MOVES: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

export default function Board({ givens, solution }: { givens: string; solution: string }) {
  const given = [...givens].map(Number);
  const [history, setHistory] = useState<History>(() => ({
    past: [],
    present: { values: given, notes: Array(81).fill(0) },
    future: [],
  }));
  const [selected, setSelected] = useState(() => given.findIndex((v) => v === 0));
  const [noteMode, setNoteMode] = useState(false);

  const { values, notes } = history.present;
  const solved = values.join("") === solution;
  const bad = conflicts(values);

  const commit = useCallback((next: Snapshot) => {
    setHistory((h) => ({ past: [...h.past, h.present], present: next, future: [] }));
  }, []);

  const input = useCallback(
    (d: number, asNote: boolean) => {
      if (solved || selected < 0 || given[selected]) return;
      const v = [...values], n = [...notes];
      if (asNote) {
        if (v[selected]) return;
        n[selected] ^= 1 << d;
      } else {
        v[selected] = v[selected] === d ? 0 : d;
        n[selected] = 0;
        // Placing a digit rules it out of every peer's pencil marks.
        if (v[selected]) for (const p of PEERS[selected]) n[p] &= ~(1 << d);
      }
      commit({ values: v, notes: n });
    },
    [solved, selected, given, values, notes, commit],
  );

  const erase = useCallback(() => {
    if (solved || selected < 0 || given[selected]) return;
    if (!values[selected] && !notes[selected]) return;
    const v = [...values], n = [...notes];
    if (v[selected]) v[selected] = 0;
    else n[selected] = 0;
    commit({ values: v, notes: n });
  }, [solved, selected, given, values, notes, commit]);

  const fillNotes = () => commit({ values, notes: candidates(values) });

  const undo = useCallback(() => setHistory((h) =>
    h.past.length ? { past: h.past.slice(0, -1), present: h.past.at(-1)!, future: [h.present, ...h.future] } : h), []);
  const redo = useCallback(() => setHistory((h) =>
    h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (mod || e.altKey) return;
      // e.code, not e.key: Shift+1 is "!" as a key but still Digit1 as a code.
      const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
      if (m) { e.preventDefault(); input(Number(m[1]), noteMode !== e.shiftKey); return; }
      const move = MOVES[e.key];
      if (move) {
        e.preventDefault();
        // Wraps around the edges.
        setSelected((s) => ((row(Math.max(s, 0)) + move[0] + 9) % 9) * 9 + (col(Math.max(s, 0)) + move[1] + 9) % 9);
        return;
      }
      if (["Backspace", "Delete", "0"].includes(e.key)) { e.preventDefault(); erase(); return; }
      if (e.key === "n") setNoteMode((x) => !x);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [input, erase, undo, redo, noteMode]);

  const selDigit = selected >= 0 ? values[selected] : 0;

  return (
    <div className="flex w-full max-w-[540px] flex-col gap-4">
      <div
        role="grid"
        aria-label="Sudoku board"
        className="@container grid aspect-square w-full grid-cols-9 border-2 border-foreground select-none"
      >
        {values.map((v, c) => {
          const isSel = c === selected;
          const related = selected >= 0 && (row(c) === row(selected) || col(c) === col(selected) || box(c) === box(selected));
          const same = selDigit !== 0 && v === selDigit;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setSelected(c)}
              aria-label={`Row ${row(c) + 1}, column ${col(c) + 1}, ${v || "empty"}`}
              aria-selected={isSel}
              className={[
                "relative flex items-center justify-center border-zinc-400 dark:border-zinc-600 text-[7cqw] leading-none",
                col(c) % 3 === 2 && col(c) !== 8 ? "border-r-2 border-r-foreground" : col(c) !== 8 ? "border-r" : "",
                row(c) % 3 === 2 && row(c) !== 8 ? "border-b-2 border-b-foreground" : row(c) !== 8 ? "border-b" : "",
                isSel ? "bg-sky-300 dark:bg-sky-700"
                  : same ? "bg-sky-200 dark:bg-sky-900"
                  : related ? "bg-zinc-100 dark:bg-zinc-800"
                  : "",
                bad.has(c) ? "text-red-600 dark:text-red-400"
                  : given[c] ? "font-semibold"
                  : "text-sky-700 dark:text-sky-300",
              ].join(" ")}
            >
              {v ? v : notes[c] ? (
                <span className="grid h-full w-full grid-cols-3 grid-rows-3 p-[0.3cqw] text-[2.4cqw] text-zinc-500 dark:text-zinc-400">
                  {DIGITS.map((d) => (
                    <span key={d} className={`flex items-center justify-center ${selDigit === d && notes[c] & (1 << d) ? "font-bold text-sky-700 dark:text-sky-300" : ""}`}>
                      {notes[c] & (1 << d) ? d : ""}
                    </span>
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {solved ? (
        <p role="status" className="text-center text-xl font-semibold text-emerald-700 dark:text-emerald-400">Solved.</p>
      ) : (
        <>
          <div className="grid grid-cols-9 gap-1">
            {DIGITS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => input(d, noteMode)}
                className="aspect-square rounded bg-zinc-100 text-2xl hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                {d}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2 text-sm">
            <button type="button" onClick={() => setNoteMode((x) => !x)} aria-pressed={noteMode}
              className={`rounded px-2 py-2 ${noteMode ? "bg-sky-600 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`}>
              Notes
            </button>
            <button type="button" onClick={fillNotes} className="rounded bg-zinc-100 px-2 py-2 dark:bg-zinc-800">Fill notes</button>
            <button type="button" onClick={erase} className="rounded bg-zinc-100 px-2 py-2 dark:bg-zinc-800">Erase</button>
            <button type="button" onClick={undo} disabled={!history.past.length} className="rounded bg-zinc-100 px-2 py-2 disabled:opacity-40 dark:bg-zinc-800">Undo</button>
            <button type="button" onClick={redo} disabled={!history.future.length} className="rounded bg-zinc-100 px-2 py-2 disabled:opacity-40 dark:bg-zinc-800">Redo</button>
          </div>
          <p className="hidden text-xs text-zinc-500 sm:block">
            Keys: 1–9 to place, Shift+1–9 or N for notes, arrows to move, Backspace to erase, Ctrl/⌘+Z to undo.
          </p>
        </>
      )}
    </div>
  );
}
