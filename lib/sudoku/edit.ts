/**
 * What the player's actions do to the board. Pure, so the board component only
 * wires them up. Each returns the same object when nothing changes, so a no-op
 * does not become an undo step.
 */
import { PEERS } from "./grid.ts";

/** Digits (0 empty), pencil marks (bit d = digit d) and paint (0 none, 1-4) per cell. */
export type Cells = { values: number[]; notes: number[]; colors: number[] };

export const PAINTS = 4;

/** Places d in one cell, or takes it out if it is already there, and clears it from the peers' notes. */
export function place(b: Cells, cell: number, d: number): Cells {
  const values = [...b.values], notes = [...b.notes];
  values[cell] = values[cell] === d ? 0 : d;
  notes[cell] = 0;
  if (values[cell]) for (const p of PEERS[cell]) notes[p] &= ~(1 << d);
  return { ...b, values, notes };
}

/**
 * Toggles pencil mark d across the empty cells among `cells`: removes it if every
 * one of them has it, otherwise adds it to all of them.
 */
export function toggleNote(b: Cells, cells: number[], d: number): Cells {
  const open = cells.filter((c) => !b.values[c]);
  if (!open.length) return b;
  const bit = 1 << d;
  const remove = open.every((c) => b.notes[c] & bit);
  const notes = [...b.notes];
  for (const c of open) notes[c] = remove ? notes[c] & ~bit : notes[c] | bit;
  return { ...b, notes };
}

/** Clears the digits the player placed and the pencil marks in `cells`. Givens stay. */
export function erase(b: Cells, cells: number[], given: number[]): Cells {
  const targets = cells.filter((c) => !given[c] && (b.values[c] || b.notes[c]));
  if (!targets.length) return b;
  const values = [...b.values], notes = [...b.notes];
  for (const c of targets) { values[c] = 0; notes[c] = 0; }
  return { ...b, values, notes };
}

/** Paints `cells` with colour k, or clears them if they all have it already. 0 clears. */
export function paint(b: Cells, cells: number[], k: number): Cells {
  if (!cells.length) return b;
  const clear = k === 0 || cells.every((c) => b.colors[c] === k);
  const colors = [...b.colors];
  for (const c of cells) colors[c] = clear ? 0 : k;
  return colors.every((k, i) => k === b.colors[i]) ? b : { ...b, colors };
}
