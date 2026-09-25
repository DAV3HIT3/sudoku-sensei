import { expect, test } from "vitest";
import { dailyPuzzle, mastery, MASTERED, recommend, type Evidence, type TechniqueState } from "./mastery.ts";

const DAY = 86_400_000, NOW = 1_800_000_000_000;
const ev = (e: Partial<Evidence>): Evidence => ({ drills: [], cleanSolves: 0, hints: [], lastPracticed: NOW, ...e });
const drills = (...rights: boolean[]) => rights.map((correct) => ({ correct, at: NOW }));

test("nothing done is no mastery", () => {
  expect(mastery(ev({ lastPracticed: null }), NOW)).toBe(0);
});

test("four of the last five drills right is mastered; older ones do not count", () => {
  expect(mastery(ev({ drills: drills(true, true, false, true, true) }), NOW)).toBeCloseTo(0.8);
  expect(mastery(ev({ drills: drills(false, false, true, true, true, true, true) }), NOW)).toBeCloseTo(0.6);
});

test("three clean solves are as good as perfect drills", () => {
  expect(mastery(ev({ cleanSolves: 3 }), NOW)).toBe(1);
  expect(mastery(ev({ cleanSolves: 1, drills: drills(true, true, true) }), NOW)).toBeCloseTo(0.6);
});

test("hints take some away", () => {
  expect(mastery(ev({ cleanSolves: 3, hints: [{ level: 3 }, { level: 1 }] }), NOW)).toBeCloseTo(0.87);
  expect(mastery(ev({ cleanSolves: 3, hints: Array(20).fill({ level: 3 }) }), NOW)).toBeCloseTo(0.5); // capped
});

test("fades after two weeks idle, halving every two months", () => {
  expect(mastery(ev({ cleanSolves: 3, lastPracticed: NOW - 14 * DAY }), NOW)).toBe(1);
  expect(mastery(ev({ cleanSolves: 3, lastPracticed: NOW - 74 * DAY }), NOW)).toBeCloseTo(0.5);
});

const state = (slug: string, s: Partial<TechniqueState> = {}): TechniqueState =>
  ({ slug, mastery: 0, lessonDone: false, drillScore: 0, nextPuzzle: null, ...s });

test("recommend: a game in progress first", () => {
  expect(recommend(7, [state("a")], 1)).toEqual({ kind: "continue", puzzleId: 7 });
});

test("recommend: the first unmastered technique's lesson, then drills, then a puzzle", () => {
  const done = state("a", { mastery: 1 });
  expect(recommend(null, [done, state("b"), state("c")], 1)).toEqual({ kind: "lesson", technique: "b" });
  expect(recommend(null, [done, state("b", { lessonDone: true, nextPuzzle: 5 })], 1)).toEqual({ kind: "drills", technique: "b" });
  expect(recommend(null, [done, state("b", { lessonDone: true, drillScore: MASTERED, mastery: 0.5, nextPuzzle: 5 })], 1))
    .toEqual({ kind: "puzzle", technique: "b", puzzleId: 5 });
  expect(recommend(null, [done, state("b", { lessonDone: true, drillScore: MASTERED, mastery: 0.5 })], 1))
    .toEqual({ kind: "drills", technique: "b" }); // no puzzle left to play
});

test("recommend: all mastered means today's puzzle", () => {
  expect(recommend(null, [state("a", { mastery: 1 })], 42)).toEqual({ kind: "daily", puzzleId: 42 });
});

test("daily puzzle changes by the day and is the same all day", () => {
  const ids = [10, 20, 30];
  const today = dailyPuzzle(ids, NOW);
  expect(dailyPuzzle(ids, NOW + 1000)).toBe(today);
  expect(dailyPuzzle(ids, NOW + DAY)).not.toBe(today);
});
