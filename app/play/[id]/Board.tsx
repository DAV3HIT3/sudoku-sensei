"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import GridView, { PAINT_CLASSES, stepMarks, type Mark, type Pick } from "@/components/GridView";
import type { HintTaken } from "@/db/schema";
import type { SavedGame } from "@/lib/games";
import { erase, paint, PAINTS, place, toggleNote, type Cells } from "@/lib/sudoku/edit";
import { box, candidates, col, conflicts, row } from "@/lib/sudoku/grid";
import { applyHint, hint, hintText, type Hint } from "@/lib/sudoku/hint";
import type { Link as ChainLink } from "@/lib/sudoku/solver";
import { load, save } from "./actions";

/** What undo steps through: every digit, pencil mark (bitmask per cell) and paint colour. */
type Snapshot = Cells;
type History = { past: Snapshot[]; present: Snapshot; future: Snapshot[] };

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const MOVES: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

const fresh = (givens: string): Snapshot => ({ values: [...givens].map(Number), notes: Array(81).fill(0), colors: Array(81).fill(0) });
const fromSaved = (g: SavedGame): Snapshot =>
  ({ values: [...g.state.values].map(Number), notes: g.state.notes, colors: g.state.colors ?? Array(81).fill(0) });
const toState = (b: Snapshot) => ({ values: b.values.join(""), notes: b.notes, colors: b.colors });

export default function Board({ puzzleId, givens, solution, saved }: {
  puzzleId: number; givens: string; solution: string; saved: SavedGame | null;
}) {
  const given = [...givens].map(Number);
  const [history, setHistory] = useState<History>(() => ({
    past: [],
    present: saved ? fromSaved(saved) : fresh(givens),
    future: [],
  }));
  // The selected cells, in the order picked; the last is the cursor the arrow keys move.
  const [selection, setSelection] = useState<number[]>(() => [given.findIndex((v) => v === 0)].filter((c) => c >= 0));
  const cursor = selection.at(-1) ?? -1;
  const [noteMode, setNoteMode] = useState(false);
  // Colour mode: the pad picks a digit to focus on instead of entering it, and a palette paints cells.
  const [colorMode, setColorMode] = useState(false);
  const [focus, setFocus] = useState(0);
  const select = useCallback((c: number, how: Pick) => setSelection((s) =>
    how === "replace" ? [c]
      : how === "toggle" ? (s.includes(c) ? s.filter((x) => x !== c) : [...s, c])
      : s.includes(c) ? s : [...s, c]), []);

  const { values, notes } = history.present;
  const solved = values.join("") === solution;
  const [hints, setHints] = useState<HintTaken[]>(saved?.hints ?? []);
  const bad = conflicts(values);
  const placed = (d: number) => values.filter((v) => v === d).length;

  // Saving: every change is sent a moment after it is made, so the game resumes
  // on any device. `synced` is the board as the server last had it.
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const synced = useRef({ board: history.present, hints, updatedAt: saved?.updatedAt ?? 0 });
  const latest = useRef({ board: history.present, hints });
  useEffect(() => { latest.current = { board: history.present, hints }; });
  useEffect(() => {
    const board = history.present;
    if (board === synced.current.board && hints === synced.current.hints) return;
    setStatus("saving");
    const t = setTimeout(() => {
      save(puzzleId, toState(board), hints)
        .then((g) => {
          synced.current = { board, hints, updatedAt: g.updatedAt };
          // A newer change still waiting to be saved keeps "Saving…" up.
          if (latest.current.board === board && latest.current.hints === hints) setStatus("saved");
        })
        .catch(() => setStatus("error"));
    }, 400);
    return () => clearTimeout(t);
  }, [history.present, hints, puzzleId]);

  // Leaving with a save still waiting: send it now, as a beacon, which the browser
  // delivers even as the page goes. A link inside the app unmounts the board;
  // closing the tab, reloading or switching apps on a phone hides the page.
  useEffect(() => {
    const pending = () => {
      const { board, hints } = latest.current;
      return board !== synced.current.board || hints !== synced.current.hints
        ? { state: toState(board), hints }
        : null;
    };
    const beacon = () => {
      const p = pending();
      if (p) navigator.sendBeacon(`/api/games/${puzzleId}`, new Blob([JSON.stringify(p)], { type: "text/plain" }));
    };
    const onHide = () => document.visibilityState === "hidden" && beacon();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", beacon);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", beacon);
      // A beacon here too: a server action started now waits behind the page
      // change, so coming straight back could load the board before it lands.
      beacon();
    };
  }, [puzzleId]);

  // Pick up moves saved elsewhere since this board was loaded: from another
  // device when this tab comes back into view, and once shortly after opening, in
  // case a save sent as the last page closed (a reload straight after a move)
  // landed just after this one was read.
  const refresh = useRef(async () => {});
  useEffect(() => { refresh.current = async () => {
    if (document.visibilityState !== "visible" || status !== "saved") return;
    const g = await load(puzzleId).catch(() => null);
    if (!g || g.updatedAt <= synced.current.updatedAt) return;
    // A move made while that request was out wins over what the server had.
    if (latest.current.board !== synced.current.board || latest.current.hints !== synced.current.hints) return;
    const board = fromSaved(g);
    synced.current = { board, hints: g.hints, updatedAt: g.updatedAt };
    setHistory({ past: [], present: board, future: [] });
    setHints(g.hints);
  }; });
  useEffect(() => {
    const onShow = () => refresh.current();
    const once = setTimeout(onShow, 1500);
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      clearTimeout(once);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, []);

  // Unchanged boards (the edit functions return the same object) make no undo step.
  const commit = useCallback((next: Snapshot) => {
    setHistory((h) => (next === h.present ? h : { past: [...h.past, h.present], present: next, future: [] }));
  }, []);

  /**
   * A digit from the pad or keyboard. In colour mode it picks the digit to focus
   * on. With several cells selected, or in notes mode, it toggles that pencil mark
   * in all of them; otherwise it places the digit in the one selected cell.
   */
  const input = useCallback((d: number, asNote: boolean) => {
    if (colorMode) { setFocus((f) => (f === d ? 0 : d)); return; }
    if (solved || !selection.length) return;
    if (asNote || selection.length > 1) commit(toggleNote(history.present, selection, d));
    else if (!given[cursor]) commit(place(history.present, cursor, d));
  }, [colorMode, solved, selection, cursor, given, history.present, commit]);

  const clear = useCallback(() => {
    if (!solved) commit(erase(history.present, selection, given));
  }, [solved, selection, given, history.present, commit]);

  const fillNotes = () => commit({ ...history.present, notes: candidates(values) });
  const restart = () => { commit(fresh(givens)); setHints([]); };

  // Hints: each press reveals more (1 names the technique, 2 points at the cells,
  // 3 gives it away). A hint belongs to the board it was worked out for, so any
  // change to the board puts it away.
  const [shown, setShown] = useState<{ board: Snapshot; hint: Hint; level: number } | null>(null);
  const active = shown?.board === history.present ? shown : null;
  const takeHint = useCallback(() => {
    if (solved) return;
    if (active) {
      if (active.level === 3 || active.hint.kind === "stuck") return;
      setShown({ ...active, level: active.level + 1 });
      setHints((hs) => hs.map((h, i) => (i === hs.length - 1 ? { ...h, level: active.level + 1 } : h)));
      return;
    }
    const h = hint(history.present, [...solution].map(Number));
    setShown({ board: history.present, hint: h, level: 1 });
    if (h.kind !== "stuck") setHints((hs) => [...hs, { technique: h.kind === "step" ? h.step.technique : "mistake", level: 1 }]);
  }, [solved, active, history.present, solution]);
  const applyShown = () => active && commit({ ...history.present, ...applyHint(history.present, active.hint) });

  // What the hint draws on the board.
  let hintCells = new Set<number>();
  let marks = new Map<string, Mark>();
  let links: ChainLink[] = [];
  let showCands: number[] | null = null;
  if (active && active.level >= 2) {
    const h = active.hint;
    if (h.kind === "wrong-digit" || h.kind === "wrong-notes") hintCells.add(h.cell);
    if (h.kind === "step" && active.level === 2) hintCells = new Set(h.step.highlight.cells);
    if (h.kind === "step" && active.level === 3) {
      ({ cells: hintCells, marks, links } = stepMarks(h.step));
      showCands = h.position.cands;
    }
  }
  // At level 3 the cells the step touches show the candidates it was worked out from.
  const cellNotes = (c: number) => (showCands && hintCells.has(c) && !values[c] ? showCands[c] : notes[c]);

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
        // Wraps around the edges. Shift+arrow adds the next cell to the selection.
        const c = Math.max(cursor, 0);
        select(((row(c) + move[0] + 9) % 9) * 9 + (col(c) + move[1] + 9) % 9, e.shiftKey ? "add" : "replace");
        return;
      }
      if (["Backspace", "Delete", "0"].includes(e.key)) { e.preventDefault(); clear(); return; }
      if (e.key === "n") setNoteMode((x) => !x);
      if (e.key === "c") setColorMode((x) => !x);
      if (e.key === "h") takeHint();
      if (e.key === "Escape") setShown(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [input, clear, undo, redo, noteMode, takeHint, cursor, select]);

  // The digit to emphasise: the colour-mode focus, else the digit in the one selected cell.
  const selDigit = colorMode && focus ? focus : selection.length === 1 ? values[cursor] : 0;
  const single = selection.length === 1 ? cursor : -1;

  return (
    <div className="flex w-full max-w-[540px] flex-col gap-4">
      <p aria-live="polite" className={`-mt-2 h-4 text-right text-xs ${status === "error" ? "text-red-600" : "text-zinc-500"}`}>
        {status === "saving" ? "Saving…" : status === "error" ? "Not saved: your last moves are only on this device." : ""}
      </p>
      <GridView
        values={values}
        notes={cellNotes}
        marks={marks}
        links={links}
        selectedDigit={selDigit}
        onSelect={select}
        look={(c) => ({
          selected: selection.includes(c),
          paint: history.present.colors[c],
          tone: hintCells.has(c) ? "hint"
            // In colour mode the focus digit lights every cell it is in or could still go in.
            : selDigit !== 0 && (values[c] === selDigit || (colorMode && cellNotes(c) & (1 << selDigit))) ? "same"
            : single >= 0 && (row(c) === row(single) || col(c) === col(single) || box(c) === box(single)) ? "related"
            : undefined,
          error: bad.has(c),
          given: given[c] !== 0,
        })}
      />

      {solved ? (
        <div className="flex items-center justify-center gap-4">
          <p role="status" className="text-xl font-semibold text-emerald-700 dark:text-emerald-400">Solved.</p>
          <button type="button" onClick={restart} className="rounded bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800">Play again</button>
        </div>
      ) : (
        <>
          {active && (
            <div role="status" className="flex flex-col gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/50">
              <p>{hintText(active.hint, active.level, history.present)}</p>
              <div className="flex gap-2">
                {active.hint.kind !== "stuck" && active.level < 3 && (
                  <button type="button" onClick={takeHint} className="rounded bg-amber-200 px-3 py-1 dark:bg-amber-800">Show more</button>
                )}
                {active.hint.kind !== "stuck" && active.level === 3 && (
                  <button type="button" onClick={applyShown} className="rounded bg-amber-200 px-3 py-1 dark:bg-amber-800">Apply</button>
                )}
                {active.hint.kind === "step" && (
                  <Link href={`/techniques/${active.hint.step.technique}`} className="rounded px-3 py-1 underline">About it</Link>
                )}
                <button type="button" onClick={() => setShown(null)} className="ml-auto rounded px-3 py-1 hover:underline">Close</button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-9 gap-1">
            {DIGITS.map((d) => {
              const done = placed(d) >= 9;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => input(d, noteMode)}
                  aria-label={colorMode ? `Focus on ${d}` : done ? `${d}, all nine placed` : String(d)}
                  aria-pressed={colorMode ? focus === d : undefined}
                  className={`aspect-square rounded text-2xl ${colorMode && focus === d ? "bg-sky-600 text-white" : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"} ${done && !colorMode ? "relative text-zinc-400 after:absolute after:inset-x-[18%] after:top-1/2 after:h-0.5 after:rotate-45 after:bg-red-600 dark:text-zinc-600 dark:after:bg-red-500" : ""}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
          {colorMode && (
            <div className="flex flex-col gap-2 rounded border border-zinc-200 p-2 text-sm dark:border-zinc-800">
              <p className="text-xs text-zinc-500">Tap a digit to see where it can go. Select cells, then a colour to paint them; the same colour again clears it.</p>
              <div className="flex items-center gap-2">
                {Array.from({ length: PAINTS }, (_, i) => i + 1).map((k) => (
                  <button key={k} type="button" onClick={() => commit(paint(history.present, selection, k))}
                    aria-label={`Paint colour ${k}`}
                    className={`h-10 flex-1 rounded border border-zinc-300 dark:border-zinc-700 ${PAINT_CLASSES[k]}`} />
                ))}
                <button type="button" onClick={() => commit(paint(history.present, selection, 0))} className="h-10 rounded bg-zinc-100 px-3 dark:bg-zinc-800">Clear</button>
                <button type="button" onClick={() => commit(paint(history.present, [...Array(81).keys()], 0))} className="h-10 rounded bg-zinc-100 px-3 dark:bg-zinc-800">Clear all</button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-4 gap-2 text-sm">
            <button type="button" onClick={() => setNoteMode((x) => !x)} aria-pressed={noteMode}
              className={`rounded px-2 py-2 ${noteMode ? "bg-sky-600 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`}>
              Notes
            </button>
            <button type="button" onClick={() => setColorMode((x) => !x)} aria-pressed={colorMode}
              className={`rounded px-2 py-2 ${colorMode ? "bg-sky-600 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`}>
              Colour
            </button>
            <button type="button" onClick={fillNotes} className="rounded bg-zinc-100 px-2 py-2 dark:bg-zinc-800">Fill notes</button>
            <button type="button" onClick={clear} className="rounded bg-zinc-100 px-2 py-2 dark:bg-zinc-800">Erase</button>
            <button type="button" onClick={undo} disabled={!history.past.length} className="rounded bg-zinc-100 px-2 py-2 disabled:opacity-40 dark:bg-zinc-800">Undo</button>
            <button type="button" onClick={redo} disabled={!history.future.length} className="rounded bg-zinc-100 px-2 py-2 disabled:opacity-40 dark:bg-zinc-800">Redo</button>
            <button type="button" onClick={takeHint} className="col-span-2 rounded bg-amber-200 px-2 py-2 dark:bg-amber-800">Hint</button>
          </div>
          <div className="flex items-baseline justify-between gap-4 text-xs text-zinc-500">
            <p className="hidden sm:block">
              Drag or ⌘/Shift-click to select several cells; a digit then toggles that note in all of them.
              Keys: 1–9 to place, Shift+1–9 or N for notes, Shift+arrows to extend, C for colour, Backspace to erase, ⌘Z to undo, H for a hint.
            </p>
            <button type="button" onClick={restart} className="ml-auto shrink-0 hover:underline">Restart</button>
          </div>
        </>
      )}
    </div>
  );
}
