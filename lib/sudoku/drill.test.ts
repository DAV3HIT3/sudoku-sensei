import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { ALL, parse } from "./grid.ts";
import { checkDrill } from "./drill.ts";
import { grade, type Position } from "./solver.ts";

const rc = (r: number, c: number) => r * 9 + c;
const blank = (): Position => ({ values: Array(81).fill(0), cands: Array(81).fill(ALL) });
const drop = (p: Position, d: number, cells: number[]) => { for (const c of cells) p.cands[c] &= ~(1 << d); return p; };
const rowBut = (r: number, keep: number[]) => [...Array(9).keys()].filter((c) => !keep.includes(c)).map((c) => rc(r, c));

// Two X-Wings on 5: rows 1 and 5 in columns 2 and 7, and rows 3 and 8 in columns 4 and 9.
const twoXWings = () => {
  let p = blank();
  for (const [r, cs] of [[0, [1, 6]], [4, [1, 6]], [2, [3, 8]], [7, [3, 8]]] as const) p = drop(p, 5, rowBut(r, [...cs]));
  return p;
};

test("any instance of the technique counts, whole or in part", () => {
  const p = twoXWings();
  expect(checkDrill(p, "x-wing", { place: null, remove: [{ cell: rc(1, 1), digit: 5 }] }).correct).toBe(true);
  expect(checkDrill(p, "x-wing", { place: null, remove: [{ cell: rc(1, 3), digit: 5 }, { cell: rc(3, 8), digit: 5 }] }).correct).toBe(true);
});

test("removals from two different instances at once, or a wrong one, do not", () => {
  const p = twoXWings();
  const v = checkDrill(p, "x-wing", { place: null, remove: [{ cell: rc(1, 1), digit: 5 }, { cell: rc(1, 3), digit: 5 }] });
  expect(v.correct).toBe(false);
  expect(v.step.technique).toBe("x-wing");
  expect(checkDrill(p, "x-wing", { place: null, remove: [{ cell: rc(1, 0), digit: 5 }] }).correct).toBe(false);
  expect(checkDrill(p, "x-wing", { place: null, remove: [] }).correct).toBe(false);
});

test("singles are answered by placing the digit", () => {
  const p = drop(blank(), 6, [0, 1, 2, 9, 11, 18, 19, 20]);
  expect(checkDrill(p, "hidden-single", { place: { cell: 10, digit: 6 }, remove: [] }).correct).toBe(true);
  expect(checkDrill(p, "hidden-single", { place: { cell: 10, digit: 5 }, remove: [] }).correct).toBe(false);
});

test("the stored answer to every drill in the corpus is accepted", () => {
  const corpus = readFileSync(new URL("../../content/puzzles.txt", import.meta.url), "utf8")
    .split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => parse(l.trim().split(" ")[0]));
  for (const g of corpus)
    for (const { position, step } of grade(g).firstUses) {
      const answer = step.place.length ? { place: step.place[0], remove: [] } : { place: null, remove: step.eliminate };
      expect(checkDrill(position, step.technique, answer).correct).toBe(true);
    }
});
