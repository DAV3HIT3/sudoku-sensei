/**
 * Hints for a board as the player has it: their digits and their pencil marks,
 * which may be incomplete or wrong. Mistakes come first, because every deduction
 * after one is built on sand.
 */
import { candidates, PEERS, type Grid } from "./grid.ts";
import { cellName, nextStep, TECHNIQUES, type Position, type Step } from "./solver.ts";

export type Hint =
  | { kind: "wrong-digit"; cell: number }
  | { kind: "wrong-notes"; cell: number }
  | { kind: "step"; step: Step; position: Position }
  | { kind: "stuck" };

export type Board = { values: Grid; notes: number[] };

export function hint({ values, notes }: Board, solution: Grid): Hint {
  for (let c = 0; c < 81; c++) if (values[c] && values[c] !== solution[c]) return { kind: "wrong-digit", cell: c };
  for (let c = 0; c < 81; c++)
    if (!values[c] && notes[c] && !(notes[c] & (1 << solution[c]))) return { kind: "wrong-notes", cell: c };
  // The player's notes narrow a cell's candidates; a cell without notes has all
  // that its peers allow. Neither rules out the answer, so every step is sound.
  const base = candidates(values);
  const position = { values, cands: base.map((m, c) => (notes[c] ? m & notes[c] : m)) };
  const step = nextStep(position);
  return step ? { kind: "step", step, position } : { kind: "stuck" };
}

/** The board after doing what the hint says. */
export function applyHint(board: Board, h: Hint): Board {
  const values = [...board.values], notes = [...board.notes];
  if (h.kind === "wrong-digit") values[h.cell] = 0;
  if (h.kind === "wrong-notes") notes[h.cell] = candidates(values)[h.cell];
  if (h.kind === "step") {
    // An elimination means nothing in a cell without notes, so those get the
    // candidates the step was worked out from first.
    if (h.step.eliminate.some(({ cell }) => !notes[cell]))
      for (let c = 0; c < 81; c++) if (!values[c] && !notes[c]) notes[c] = h.position.cands[c];
    for (const { cell, digit } of h.step.eliminate) notes[cell] &= ~(1 << digit);
    for (const { cell, digit } of h.step.place) {
      values[cell] = digit;
      notes[cell] = 0;
      for (const p of PEERS[cell]) notes[p] &= ~(1 << digit);
    }
  }
  return { values, notes };
}

const list = (xs: string[]) => (xs.length < 3 ? xs.join(" and ") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/** What the hint says at each level: 1 names the idea, 2 points at the cells, 3 gives it away. */
export function hintText(h: Hint, level: number, board: Board): string {
  if (h.kind === "stuck") return "None of the techniques in the lessons applies here. This puzzle needs something harder.";
  if (h.kind === "wrong-digit")
    return ["Something on the board is wrong.", "Check the highlighted cell.", `${cellName(h.cell)} is not ${board.values[h.cell]}.`][level - 1];
  if (h.kind === "wrong-notes")
    return [
      "One of your pencil marks rules out the answer.",
      "Check the highlighted cell's notes.",
      `The notes in ${cellName(h.cell)} leave out the digit that belongs there.`,
    ][level - 1];
  const name = TECHNIQUES.find((t) => t.slug === h.step.technique)!.name;
  if (level === 1) return `Look for a ${name}.`;
  if (level === 2) return `${name}: look at the highlighted cells.`;
  return `${name}: ${h.step.why} So ${actionText(h.step)}.`;
}

/** What a step does: "place 4 in r5c6", "remove 7 from r1c5 and r8c5". */
export function actionText(step: Step): string {
  const place = step.place.map(({ cell, digit }) => `place ${digit} in ${cellName(cell)}`);
  const remove = [...Map.groupBy(step.eliminate, (e) => e.digit)].map(([d, es]) => `remove ${d} from ${list(es.map((e) => cellName(e.cell)))}`);
  return list([...place, ...remove]);
}
