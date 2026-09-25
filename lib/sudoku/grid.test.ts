import { expect, test } from "vitest";
import { candidates, conflicts, format, parse, PEERS, solve } from "./grid";

const EASY = "003020600900305001001806400008102900700000008006708200002609500800203009005010300";
const EASY_SOLUTION = "483921657967345821251876493548132976729564138136798245372689514814253769695417382";

test("every cell has 20 peers", () => {
  expect(PEERS.every((p) => p.length === 20)).toBe(true);
});

test("solves a puzzle with one solution", () => {
  const s = solve(parse(EASY));
  expect(s.map(format)).toEqual([EASY_SOLUTION]);
});

test("finds more than one solution when there are several", () => {
  expect(solve(parse(EASY.replace(/[1-9]/g, (d, i) => (i < 30 ? "0" : d)))).length).toBe(2);
});

test("an inconsistent grid has no solution", () => {
  expect(solve(parse("11" + "0".repeat(79)))).toEqual([]);
});

test("conflicts and candidates", () => {
  const g = parse("5" + "0".repeat(7) + "5" + "0".repeat(72));
  expect([...conflicts(g)]).toEqual([0, 8]);
  const c = candidates(parse(EASY));
  expect(c[0]).toBe((1 << 4) | (1 << 5)); // r1c1: 4 or 5
  expect(c[2]).toBe(0); // filled
});
