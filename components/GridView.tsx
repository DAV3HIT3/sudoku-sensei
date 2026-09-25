import { col, row } from "@/lib/sudoku/grid";
import type { Step } from "@/lib/sudoku/solver";

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export type Mark = "key" | "remove" | "place";
export type CellLook = { tone?: "selected" | "hint" | "same" | "related"; error?: boolean; given?: boolean };

/** The cells a step touches, and how to mark each candidate it involves. */
export function stepMarks(step: Step) {
  const cells = new Set(step.highlight.cells);
  const marks = new Map<string, Mark>();
  for (const { cell, digit } of step.highlight.candidates) marks.set(`${cell}:${digit}`, "key");
  for (const { cell, digit } of step.eliminate) { marks.set(`${cell}:${digit}`, "remove"); cells.add(cell); }
  for (const { cell, digit } of step.place) { marks.set(`${cell}:${digit}`, "place"); cells.add(cell); }
  return { cells, marks };
}

/**
 * A Sudoku grid: digits, pencil marks and highlights. Draws only; the board and
 * the technique pages decide what each cell looks like.
 */
export default function GridView({ values, notes, look, marks, selectedDigit = 0, onSelect, label = "Sudoku board" }: {
  values: number[];
  notes: (c: number) => number;
  look: (c: number) => CellLook;
  marks: Map<string, Mark>;
  selectedDigit?: number;
  onSelect?: (c: number) => void;
  label?: string;
}) {
  return (
    <div role="grid" aria-label={label} className="@container grid aspect-square w-full grid-cols-9 border-2 border-foreground select-none dark:border-white">
      {values.map((v, c) => {
        const l = look(c);
        const n = notes(c);
        const Cell = onSelect ? "button" : "div";
        return (
          <Cell
            key={c}
            {...(onSelect ? { type: "button" as const, onClick: () => onSelect(c), "aria-selected": l.tone === "selected" } : {})}
            aria-label={`Row ${row(c) + 1}, column ${col(c) + 1}, ${v || "empty"}`}
            className={[
              "relative flex items-center justify-center text-[7cqw] leading-none",
              // Each side gets exactly one colour: box lines strong (white in dark mode), cell lines grey.
              col(c) === 8 ? "" : col(c) % 3 === 2 ? "border-r-2 border-r-foreground dark:border-r-white" : "border-r border-r-zinc-400 dark:border-r-zinc-600",
              row(c) === 8 ? "" : row(c) % 3 === 2 ? "border-b-2 border-b-foreground dark:border-b-white" : "border-b border-b-zinc-400 dark:border-b-zinc-600",
              l.tone === "selected" ? "bg-sky-300 dark:bg-sky-700"
                : l.tone === "hint" ? "bg-amber-100 dark:bg-amber-900/60"
                : l.tone === "same" ? "bg-sky-200 dark:bg-sky-900"
                : l.tone === "related" ? "bg-zinc-100 dark:bg-zinc-800"
                : "",
              l.error ? "text-red-600 dark:text-red-400" : l.given ? "font-semibold" : "text-sky-700 dark:text-sky-300",
            ].join(" ")}
          >
            {v ? v : n ? (
              <span className="grid h-full w-full grid-cols-3 grid-rows-3 p-[0.3cqw] text-[2.4cqw] text-zinc-500 dark:text-zinc-400">
                {DIGITS.map((d) => {
                  const on = n & (1 << d);
                  const mark = marks.get(`${c}:${d}`);
                  return (
                    <span key={d} className={`flex items-center justify-center rounded-full ${
                      !on ? ""
                        : mark === "remove" ? "font-bold text-red-600 line-through decoration-2 dark:text-red-400"
                        : mark === "place" ? "bg-emerald-200 font-bold text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100"
                        : mark === "key" ? "bg-amber-300 font-bold text-amber-950 dark:bg-amber-600 dark:text-amber-50"
                        : selectedDigit === d ? "font-bold text-sky-700 dark:text-sky-300" : ""
                    }`}>
                      {on ? d : ""}
                    </span>
                  );
                })}
              </span>
            ) : null}
          </Cell>
        );
      })}
    </div>
  );
}
