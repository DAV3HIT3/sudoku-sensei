import { expect, test } from "vitest";
import { erase, paint, place, toggleNote, type Cells } from "./edit.ts";

const board = (): Cells => ({ values: Array(81).fill(0), notes: Array(81).fill(0), colors: Array(81).fill(0) });
const bits = (...ds: number[]) => ds.reduce((m, d) => m | (1 << d), 0);

test("placing a digit clears it from the peers' notes, and placing it again takes it out", () => {
  const b = board();
  b.notes[1] = bits(4, 5); b.notes[80] = bits(4);
  const p = place(b, 0, 4);
  expect(p.values[0]).toBe(4);
  expect(p.notes[1]).toBe(bits(5)); // a peer
  expect(p.notes[80]).toBe(bits(4)); // not a peer
  expect(place(p, 0, 4).values[0]).toBe(0);
});

test("a note across several cells is added to all unless all have it, then removed from all", () => {
  const b = board();
  b.notes[0] = bits(3);
  const added = toggleNote(b, [0, 1, 2], 3);
  expect([0, 1, 2].map((c) => added.notes[c])).toEqual([bits(3), bits(3), bits(3)]);
  const removed = toggleNote(added, [0, 1, 2], 3);
  expect([0, 1, 2].map((c) => removed.notes[c])).toEqual([0, 0, 0]);
});

test("notes skip filled cells, and nothing to do changes nothing", () => {
  const b = board();
  b.values[0] = 9;
  const n = toggleNote(b, [0, 1], 3);
  expect(n.notes[0]).toBe(0);
  expect(n.notes[1]).toBe(bits(3));
  expect(toggleNote(b, [0], 3)).toBe(b);
});

test("erase clears placed digits and notes in every selected cell but never a given", () => {
  const b = board();
  const given = Array(81).fill(0); given[0] = 7;
  b.values[0] = 7; b.values[1] = 2; b.notes[2] = bits(1, 2);
  const e = erase(b, [0, 1, 2], given);
  expect([e.values[0], e.values[1], e.notes[2]]).toEqual([7, 0, 0]);
  expect(erase(e, [0, 1, 2], given)).toBe(e);
});

test("paint sets a colour, repainting the same colour clears it, and 0 clears", () => {
  const b = board();
  const p = paint(b, [0, 1], 2);
  expect([p.colors[0], p.colors[1]]).toEqual([2, 2]);
  expect([paint(p, [0, 1], 3).colors[0], paint(p, [0, 1], 2).colors[0], paint(p, [0], 0).colors[0]]).toEqual([3, 0, 0]);
  expect(paint(b, [0], 0)).toBe(b);
});
