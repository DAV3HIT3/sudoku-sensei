import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { parse, solve } from "./grid.ts";
import { applyHint, hint, hintText, type Board } from "./hint.ts";
import { grade } from "./solver.ts";

const EASY = parse("003020600900305001001806400008102900700000008006708200002609500800203009005010300");
const SOLUTION = solve(EASY)[0];
const fresh = (g: number[]): Board => ({ values: [...g], notes: Array(81).fill(0) });

test("a wrong digit comes before anything else", () => {
  const b = fresh(EASY);
  b.values[0] = 5; // the answer is 4
  const h = hint(b, SOLUTION);
  expect(h).toEqual({ kind: "wrong-digit", cell: 0 });
  expect(hintText(h, 3, b)).toBe("r1c1 is not 5.");
  expect(applyHint(b, h).values[0]).toBe(0);
});

test("notes that leave out the answer are a mistake", () => {
  const b = fresh(EASY);
  b.notes[0] = 1 << 5; // 4 belongs here
  const h = hint(b, SOLUTION);
  expect(h).toEqual({ kind: "wrong-notes", cell: 0 });
  expect(applyHint(b, h).notes[0]).toBe((1 << 4) | (1 << 5));
});

test("text at each level", () => {
  const b = fresh(EASY);
  const h = hint(b, SOLUTION);
  expect(h.kind).toBe("step");
  expect(hintText(h, 1, b)).toMatch(/^Look for a /);
  expect(hintText(h, 3, b)).toMatch(/\. So place \d in r\dc\d\.$/);
});

const corpus = readFileSync(new URL("../../content/puzzles.txt", import.meta.url), "utf8")
  .split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => parse(l.trim().split(" ")[0]));

test("hints alone finish every puzzle the catalog can solve, from an empty board of notes", () => {
  for (const givens of corpus.filter((g) => grade(g).solved)) {
    const solution = solve(givens)[0];
    let b = fresh(givens);
    for (let i = 0; i < 500 && b.values.includes(0); i++) {
      const h = hint(b, solution);
      expect(h.kind).toBe("step");
      b = applyHint(b, h);
    }
    expect(b.values).toEqual(solution);
  }
}, 120_000);
