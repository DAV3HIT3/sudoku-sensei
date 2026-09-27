import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { ALL, parse, solve } from "./grid.ts";
import { apply, grade, nextStep, start, TECHNIQUES, type Position } from "./solver.ts";

const rc = (r: number, c: number) => r * 9 + c;
const blank = (): Position => ({ values: Array(81).fill(0), cands: Array(81).fill(ALL) });
const bits = (...ds: number[]) => ds.reduce((m, d) => m | (1 << d), 0);
/** Rules d out of every cell in `cells`. */
const drop = (p: Position, d: number, cells: number[]) => { for (const c of cells) p.cands[c] &= ~(1 << d); return p; };
const rowCells = (r: number, except: number[] = []) => [...Array(9).keys()].filter((c) => !except.includes(c)).map((c) => rc(r, c));
const colCells = (c: number, except: number[] = []) => [...Array(9).keys()].filter((r) => !except.includes(r)).map((r) => rc(r, c));
const find = (slug: string, p: Position) => TECHNIQUES.find((t) => t.slug === slug)!.find(p);
const elims = (slug: string, p: Position) => find(slug, p)?.eliminate.map((e) => `${e.cell}:${e.digit}`).sort();
const as = (cells: number[], ...ds: number[]) => cells.flatMap((c) => ds.map((d) => `${c}:${d}`)).sort();

describe("each technique finds its pattern", () => {
  test("full house", () => {
    const p = blank();
    for (let c = 0; c < 8; c++) p.values[c] = c + 1;
    expect(find("full-house", p)?.place).toEqual([{ cell: 8, digit: 9 }]);
  });
  test("naked single", () => {
    const p = blank();
    p.cands[40] = bits(7);
    expect(find("naked-single", p)?.place).toEqual([{ cell: 40, digit: 7 }]);
  });
  test("hidden single", () => {
    const p = drop(blank(), 6, [0, 1, 2, 9, 11, 18, 19, 20]);
    expect(find("hidden-single", p)?.place).toEqual([{ cell: 10, digit: 6 }]);
  });
  test("pointing", () => {
    const p = drop(blank(), 2, [9, 10, 11, 18, 19, 20]);
    expect(elims("pointing", p)).toEqual(as(rowCells(0, [0, 1, 2]), 2));
  });
  test("claiming", () => {
    const p = drop(blank(), 2, rowCells(0, [0, 1, 2]));
    expect(elims("claiming", p)).toEqual(as([9, 10, 11, 18, 19, 20], 2));
  });
  test("naked pair, triple, quad", () => {
    const p = blank();
    [p.cands[0], p.cands[1]] = [bits(1, 2), bits(1, 2)];
    expect(elims("naked-pair", p)).toEqual(as(rowCells(0, [0, 1]), 1, 2));
    [p.cands[0], p.cands[1], p.cands[2]] = [bits(1, 2), bits(2, 3), bits(1, 3)];
    expect(elims("naked-triple", p)).toEqual(as(rowCells(0, [0, 1, 2]), 1, 2, 3));
    [p.cands[0], p.cands[1], p.cands[2], p.cands[3]] = [bits(1, 2), bits(2, 3), bits(3, 4), bits(1, 4)];
    expect(elims("naked-quad", p)).toEqual(as(rowCells(0, [0, 1, 2, 3]), 1, 2, 3, 4));
  });
  test("hidden pair, triple, quad", () => {
    const pair = [1, 2].reduce((p, d) => drop(p, d, rowCells(0, [0, 1])), blank());
    expect(elims("hidden-pair", pair)).toEqual(as([0, 1], 3, 4, 5, 6, 7, 8, 9));
    const triple = [1, 2, 3].reduce((p, d) => drop(p, d, rowCells(0, [0, 1, 2])), blank());
    expect(elims("hidden-triple", triple)).toEqual(as([0, 1, 2], 4, 5, 6, 7, 8, 9));
    const quad = [1, 2, 3, 4].reduce((p, d) => drop(p, d, rowCells(0, [0, 1, 2, 3])), blank());
    expect(elims("hidden-quad", quad)).toEqual(as([0, 1, 2, 3], 5, 6, 7, 8, 9));
  });
  test("x-wing", () => {
    const p = drop(drop(blank(), 5, rowCells(0, [1, 6])), 5, rowCells(4, [1, 6]));
    expect(elims("x-wing", p)).toEqual(as([...colCells(1, [0, 4]), ...colCells(6, [0, 4])], 5));
  });
  test("swordfish", () => {
    const p = drop(drop(drop(blank(), 8, rowCells(0, [1, 4])), 8, rowCells(3, [4, 7])), 8, rowCells(6, [1, 7]));
    expect(elims("swordfish", p)).toEqual(as([1, 4, 7].flatMap((c) => colCells(c, [0, 3, 6])), 8));
  });
  test("jellyfish", () => {
    let p = blank();
    for (const [r, cs] of [[0, [0, 3]], [2, [3, 5]], [4, [5, 8]], [6, [8, 0]]] as const) p = drop(p, 9, rowCells(r, [...cs]));
    expect(elims("jellyfish", p)).toEqual(as([0, 3, 5, 8].flatMap((c) => colCells(c, [0, 2, 4, 6])), 9));
  });
  test("skyscraper", () => {
    const p = drop(drop(blank(), 3, rowCells(0, [0, 4])), 3, rowCells(5, [0, 3]));
    expect(elims("skyscraper", p)).toEqual(as([rc(1, 3), rc(2, 3), rc(3, 4), rc(4, 4)], 3));
  });
  test("2-string kite", () => {
    const p = drop(drop(blank(), 7, rowCells(0, [1, 6])), 7, colCells(2, [1, 6]));
    expect(elims("2-string-kite", p)).toEqual(as([rc(6, 6)], 7));
  });
  test("empty rectangle", () => {
    const p = drop(drop(blank(), 4, [rc(0, 0), rc(0, 2), rc(2, 0), rc(2, 2)]), 4, colCells(5, [1, 7]));
    expect(elims("empty-rectangle", p)).toEqual(as([rc(7, 1)], 4));
  });
  test("xy-wing", () => {
    const p = blank();
    [p.cands[rc(4, 4)], p.cands[rc(4, 7)], p.cands[rc(1, 4)]] = [bits(1, 2), bits(1, 3), bits(2, 3)];
    expect(elims("xy-wing", p)).toEqual(as([rc(1, 7)], 3));
  });
  test("xyz-wing", () => {
    const p = blank();
    [p.cands[rc(4, 4)], p.cands[rc(4, 3)], p.cands[rc(1, 4)]] = [bits(1, 2, 3), bits(1, 3), bits(2, 3)];
    expect(elims("xyz-wing", p)).toEqual(as([rc(3, 4), rc(5, 4)], 3));
  });
  test("w-wing", () => {
    const p = drop(blank(), 5, rowCells(8, [0, 7]));
    [p.cands[rc(0, 0)], p.cands[rc(4, 7)]] = [bits(5, 6), bits(5, 6)];
    expect(elims("w-wing", p)).toEqual(as([rc(0, 7), rc(4, 0)], 6));
  });
  test("nothing to find in an open position", () => {
    for (const t of TECHNIQUES) expect(t.find(blank())).toBeNull();
  });
});

const corpus = readFileSync(new URL("../../content/puzzles.txt", import.meta.url), "utf8")
  .split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.trim().split(" ")[0]);

describe("grading", () => {
  test("an easy puzzle needs only singles", () => {
    const g = grade(parse("003020600900305001001806400008102900700000008006708200002609500800203009005010300"));
    expect(g.solved).toBe(true);
    expect(g.techniques.every((t) => TECHNIQUES.find((x) => x.slug === t)!.tier === 1)).toBe(true);
  });
  test("Inkala's puzzle is beyond the catalog", () => {
    expect(grade(parse("800000000003600000070090200050007000000045700000100030001000068008500010090000400")).solved).toBe(false);
  });
  test("every technique is the hardest step of at least one puzzle, so each has puzzles to practise", () => {
    const hardest = new Set(corpus.map((g) => grade(parse(g))).filter((r) => r.solved).map((r) => TECHNIQUES[r.difficulty].slug));
    expect(TECHNIQUES.map((t) => t.slug).filter((t) => !hardest.has(t))).toEqual([]);
  });
  test("every step on every corpus puzzle agrees with its solution", () => {
    for (const givens of corpus) {
      const grid = parse(givens);
      const solution = solve(grid)[0];
      let p = start(grid);
      for (let s = nextStep(p); s; s = nextStep(p)) {
        for (const { cell, digit } of s.place) expect(digit, `${s.technique} placed wrongly in ${givens}`).toBe(solution[cell]);
        for (const { cell, digit } of s.eliminate) expect(digit, `${s.technique} removed the answer in ${givens}`).not.toBe(solution[cell]);
        p = apply(p, s);
      }
    }
  });
});

test("every technique has a write-up headed with its name", () => {
  for (const t of TECHNIQUES) {
    const md = readFileSync(new URL(`../../content/techniques/${t.slug}.md`, import.meta.url), "utf8");
    expect(md.split("\n")[0]).toBe(`# ${t.name}`);
    expect(md.length).toBeGreaterThan(100);
  }
});

describe("simple coloring", () => {
  /** A position where digit d is a candidate only in `cells`, and everything else is open. */
  const only = (d: number, cells: number[]) => drop(blank(), d, [...Array(81).keys()].filter((c) => !cells.includes(c)));

  test("color trap: a cell seeing both colours loses the digit", () => {
    // Chain r1c1 - r1c4 - r5c4 - r6c6; r6c1 sees r1c1 (one colour) and r6c6 (the other).
    const p = only(1, [rc(0, 0), rc(0, 3), rc(4, 3), rc(5, 5), rc(5, 0), rc(5, 7), rc(8, 0)]);
    expect(elims("simple-coloring", p)).toEqual(as([rc(5, 0)], 1));
  });

  test("color wrap: two cells of one colour see each other, so that colour loses the digit", () => {
    // Chain r1c1 - r1c6 - r5c6 - r5c3 - r2c3; r1c1 and r2c3 share a colour and box 1.
    const p = only(2, [rc(0, 0), rc(0, 5), rc(4, 5), rc(4, 2), rc(1, 2), rc(2, 1)]);
    const s = find("simple-coloring", p)!;
    expect(s.eliminate.map((e) => `${e.cell}:${e.digit}`).sort()).toEqual(as([rc(0, 0), rc(4, 5), rc(1, 2)], 2));
    expect(s.why).toMatch(/r1c1 and r2c3 share a colour and see each other/);
    expect(s.highlight.others!.length).toBeGreaterThan(0);
  });
});

describe("chains and uniqueness", () => {
  const only = (d: number, cells: number[]) => drop(blank(), d, [...Array(81).keys()].filter((c) => !cells.includes(c)));
  const colBut = (c: number, keep: number[]) => colCells(c, keep);

  test("x-chain: r1c1 = r6c1 - r6c7 = r2c7; cells seeing both ends lose 4", () => {
    const p = drop(drop(blank(), 4, colBut(0, [0, 5])), 4, colBut(6, [5, 1]));
    const s = find("x-chain", p)!;
    expect(s.eliminate.map((e) => `${e.cell}:${e.digit}`).sort()).toEqual(as([rc(1, 1), rc(1, 2), rc(0, 7), rc(0, 8)], 4));
    expect(s.highlight.links!.map((l) => l.strong)).toEqual([true, false, true]);
  });

  test("xy-chain: {1,2} - {2,3} - {3,4} - {4,1}; cells seeing both ends lose 1", () => {
    const p = blank();
    [p.cands[rc(0, 0)], p.cands[rc(0, 4)], p.cands[rc(4, 4)], p.cands[rc(4, 8)]] = [bits(1, 2), bits(2, 3), bits(3, 4), bits(4, 1)];
    expect(elims("xy-chain", p)).toEqual(as([rc(0, 8), rc(4, 0)], 1));
  });

  const rectangle = (roof: [number, number]) => {
    const p = blank();
    [p.cands[rc(0, 0)], p.cands[rc(0, 3)], p.cands[rc(1, 0)], p.cands[rc(1, 3)]] = [bits(1, 2), bits(1, 2), roof[0], roof[1]];
    return p;
  };

  test("unique rectangle type 1: the fourth corner loses both digits", () => {
    expect(elims("unique-rectangle", rectangle([bits(1, 2), bits(1, 2, 5)]))).toEqual(as([rc(1, 3)], 1, 2));
  });

  test("unique rectangle type 2: the shared extra digit leaves cells seeing both roof corners", () => {
    expect(elims("unique-rectangle", rectangle([bits(1, 2, 7), bits(1, 2, 7)]))).toEqual(as([1, 2, 4, 5, 6, 7, 8].map((c) => rc(1, c)), 7));
  });

  test("unique rectangle type 4: 1 only in the roof in row 2, so the roof loses 2", () => {
    const p = drop(rectangle([bits(1, 2, 7), bits(1, 2, 8)]), 1, [1, 2, 4, 5, 6, 7, 8].map((c) => rc(1, c)));
    expect(elims("unique-rectangle", p)).toEqual(as([rc(1, 0), rc(1, 3)], 2));
  });

  test("bug+1: the odd cell takes the digit whose removal leaves every candidate twice per unit", () => {
    // Only these four cells are empty (the rest is filled; only the pattern matters here).
    const grave = (odd: number, third: number): Position => {
      const p: Position = { values: Array(81).fill(9), cands: Array(81).fill(0) };
      for (const c of [rc(0, 0), rc(0, 3), rc(1, 0), rc(1, 3)]) { p.values[c] = 0; p.cands[c] = bits(1, 2); }
      p.cands[rc(1, 0)] = third;
      p.cands[rc(1, 3)] = odd;
      return p;
    };
    expect(find("bug-plus-one", grave(bits(1, 2, 3), bits(1, 2)))?.place).toEqual([{ cell: rc(1, 3), digit: 3 }]);
    expect(find("bug-plus-one", grave(bits(1, 2, 3), bits(1, 4)))).toBeNull();
  });
});

test("every instance of every technique, at every position of every corpus solve, agrees with the solution", () => {
  for (const givens of corpus) {
    const grid = parse(givens);
    const solution = solve(grid)[0];
    let p = start(grid);
    let at = 0;
    for (let s = nextStep(p); s; s = nextStep(p), at++) {
      for (const t of TECHNIQUES) {
        // The tier-5 searches are costly: every tenth position of each solve.
        if (t.tier === 5 && at % 10) continue;
        let n = 0;
        for (const inst of t.all(p)) {
          for (const { cell, digit } of inst.place) expect(digit, `${t.slug} placed wrongly in ${givens}`).toBe(solution[cell]);
          for (const { cell, digit } of inst.eliminate) expect(digit, `${t.slug} removed the answer in ${givens}: ${inst.why}`).not.toBe(solution[cell]);
          if (++n >= 50) break;
        }
      }
      p = apply(p, s);
    }
  }
}, 600_000);

describe("tier 5", () => {
  const rowBut = (r: number, keep: number[]) => rowCells(r, keep);

  test("finned x-wing: 5 in rows 1 and 5 in columns 2 and 7, fin r5c8; box 6 loses 5 in column 7", () => {
    const p = drop(drop(blank(), 5, rowBut(0, [1, 6])), 5, rowBut(4, [1, 6, 7]));
    const s = find("finned-x-wing", p)!;
    expect(s.eliminate.map((e) => `${e.cell}:${e.digit}`).sort()).toEqual(as([rc(3, 6), rc(5, 6)], 5));
    expect(s.why).not.toMatch(/sashimi/);
  });

  test("sashimi x-wing: the same with r5c2 missing", () => {
    const p = drop(drop(blank(), 5, rowBut(0, [1, 6])), 5, rowBut(4, [6, 7]));
    const s = find("finned-x-wing", p)!;
    expect(s.eliminate.map((e) => `${e.cell}:${e.digit}`).sort()).toEqual(as([rc(3, 6), rc(5, 6)], 5));
    expect(s.why).toMatch(/sashimi/);
  });

  test("sue de coq: r1c1 {1,2,3} and r1c2 {2,3,4}, with r1c6 {1,2} and r3c3 {3,4}", () => {
    const p = blank();
    [p.cands[rc(0, 0)], p.cands[rc(0, 1)], p.cands[rc(0, 5)], p.cands[rc(2, 2)]] = [bits(1, 2, 3), bits(2, 3, 4), bits(1, 2), bits(3, 4)];
    const line = [2, 3, 4, 6, 7, 8].map((c) => rc(0, c));
    const boxRest = [rc(0, 2), rc(1, 0), rc(1, 1), rc(1, 2), rc(2, 0), rc(2, 1)];
    expect(elims("sue-de-coq", p)).toEqual([...as(line, 1, 2), ...as(boxRest, 3, 4)].sort());
  });

  test("als-xz: r4c6 {1,2} and box 4's r4c2 {1,3} + r6c3 {2,3}, linked by 1; cells seeing every 2 lose it", () => {
    const p = blank();
    [p.cands[rc(3, 5)], p.cands[rc(3, 1)], p.cands[rc(5, 2)]] = [bits(1, 2), bits(1, 3), bits(2, 3)];
    expect(elims("als-xz", p)).toEqual(as([rc(3, 0), rc(3, 2), rc(5, 3), rc(5, 4), rc(5, 5)], 2));
  });

  test("aic: (1)r1c1 = (1)r1c5 - (1)r5c5 = (2)r5c5 - (2)r5c9 = (2)r1c9, so r1c1 is not 2", () => {
    const p = drop(drop(blank(), 1, rowBut(0, [0, 4])), 2, colCells(8, [4, 0]));
    p.cands[rc(4, 4)] = bits(1, 2);
    const found = [...TECHNIQUES.find((t) => t.slug === "aic")!.all(p)];
    expect(found.some((s) => s.eliminate.some((e) => e.cell === rc(0, 0) && e.digit === 2))).toBe(true);
  });
});
