/**
 * The human-style solver: a position (digits plus the candidates still open), one
 * generator per technique that lists every step it can take there, and the order
 * a person would try them in.
 */
import { ALL, box, candidates, col, PEERS, popcount, row, type Grid } from "./grid.ts";

export type Candidate = { cell: number; digit: number };

/** One deduction. Drives hints, grading, lessons and drills alike. */
export type Step = {
  technique: string;
  place: Candidate[];
  eliminate: Candidate[];
  /**
   * What to draw: the cells the pattern lives in and its key candidates, plus a
   * second group in another colour where a pattern has two sides (coloring).
   */
  highlight: { cells: number[]; candidates: Candidate[]; others?: Candidate[] };
  /** Why this instance works, in a sentence or two, naming its cells. */
  why: string;
};

/** Digits placed so far, and for each empty cell the candidates not yet ruled out. */
export type Position = { values: Grid; cands: number[] };

export const start = (givens: Grid): Position => ({ values: [...givens], cands: candidates(givens) });

export function apply(p: Position, step: Step): Position {
  const values = [...p.values], cands = [...p.cands];
  for (const { cell, digit } of step.place) {
    values[cell] = digit;
    cands[cell] = 0;
    for (const q of PEERS[cell]) cands[q] &= ~(1 << digit);
  }
  for (const { cell, digit } of step.eliminate) cands[cell] &= ~(1 << digit);
  return { values, cands };
}

// Units: rows 0-8, columns 9-17, boxes 18-26.
export const UNITS: number[][] = [
  ...Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, i) => r * 9 + i)),
  ...Array.from({ length: 9 }, (_, c) => Array.from({ length: 9 }, (_, i) => i * 9 + c)),
  ...Array.from({ length: 9 }, (_, b) =>
    Array.from({ length: 9 }, (_, i) => (Math.floor(b / 3) * 3 + Math.floor(i / 3)) * 9 + (b % 3) * 3 + (i % 3))),
];
const ROWS = [0, 1, 2, 3, 4, 5, 6, 7, 8], COLS = ROWS.map((i) => i + 9), BOXES = ROWS.map((i) => i + 18);
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const PEER_SET = PEERS.map((p) => new Set(p));

export const sees = (a: number, b: number) => PEER_SET[a].has(b);
const has = (p: Position, cell: number, d: number) => (p.cands[cell] & (1 << d)) !== 0;
const digitsOf = (mask: number) => DIGITS.filter((d) => mask & (1 << d));
/** The cells of unit u where d is still a candidate. */
const spots = (p: Position, u: number, d: number) => UNITS[u].filter((c) => has(p, c, d));
const cands = (p: Position, cells: number[], ds: number[]) =>
  cells.flatMap((cell) => ds.filter((d) => has(p, cell, d)).map((digit) => ({ cell, digit })));

// Names for explanations: r3c4, row 3, column 4, box 5 (boxes numbered row by row).
export const cellName = (c: number) => `r${row(c) + 1}c${col(c) + 1}`;
const unitName = (u: number) => (u < 9 ? `row ${u + 1}` : u < 18 ? `column ${u - 8}` : `box ${u - 17}`);
const list = (xs: (string | number)[]) =>
  xs.length < 3 ? xs.join(" and ") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`;
const cellList = (cs: number[]) => list(cs.map(cellName));
const setOf = (m: number) => `{${digitsOf(m).join(",")}}`;

/** Cells other than `except` that see every cell in `cells` and still have d. */
function seeingAll(p: Position, cells: number[], d: number, except: number[] = cells): Candidate[] {
  const out: Candidate[] = [];
  for (let c = 0; c < 81; c++)
    if (has(p, c, d) && !except.includes(c) && cells.every((x) => sees(c, x))) out.push({ cell: c, digit: d });
  return out;
}

function* combinations<T>(items: T[], k: number, from = 0, acc: T[] = []): Generator<T[]> {
  if (acc.length === k) { yield acc; return; }
  for (let i = from; i < items.length; i++) yield* combinations(items, k, i + 1, [...acc, items[i]]);
}

const step = (technique: string, s: Partial<Step> & { why: string }): Step => ({
  technique, place: [], eliminate: [], highlight: { cells: [], candidates: [] }, ...s,
});

type Finder = (p: Position) => Generator<Step>;

// ---- Tier 1: singles -------------------------------------------------------

function* fullHouse(p: Position): Generator<Step> {
  for (let u = 0; u < 27; u++) {
    const empty = UNITS[u].filter((c) => !p.values[c]);
    if (empty.length !== 1) continue;
    const used = UNITS[u].reduce((m, c) => m | (1 << p.values[c]), 0);
    const digit = digitsOf(ALL & ~used)[0];
    yield step("full-house", {
      place: [{ cell: empty[0], digit }],
      highlight: { cells: UNITS[u], candidates: [] },
      why: `${cap(unitName(u))} has only ${cellName(empty[0])} left empty, and ${digit} is the one digit it is missing.`,
    });
  }
}

function* nakedSingle(p: Position): Generator<Step> {
  for (let c = 0; c < 81; c++)
    if (!p.values[c] && popcount(p.cands[c]) === 1) {
      const digit = digitsOf(p.cands[c])[0];
      yield step("naked-single", {
        place: [{ cell: c, digit }],
        highlight: { cells: [c], candidates: [] },
        why: `Every digit but ${digit} is ruled out of ${cellName(c)}.`,
      });
    }
}

function* hiddenSingle(p: Position): Generator<Step> {
  // Boxes first: that is where people find them.
  for (const u of [...BOXES, ...ROWS, ...COLS])
    for (const d of DIGITS) {
      const s = spots(p, u, d);
      if (s.length === 1)
        yield step("hidden-single", {
          place: [{ cell: s[0], digit: d }],
          highlight: { cells: UNITS[u], candidates: [{ cell: s[0], digit: d }] },
          why: `In ${unitName(u)}, ${d} fits only in ${cellName(s[0])}.`,
        });
    }
}

// ---- Tier 2: intersections and subsets ------------------------------------

/** Pointing: a digit's spots in a box all lie on one line, so the rest of that line loses it. */
function* pointing(p: Position): Generator<Step> {
  for (const b of BOXES)
    for (const d of DIGITS) {
      const s = spots(p, b, d);
      if (s.length < 2) continue;
      for (const lines of [ROWS, COLS]) {
        const line = lines.find((l) => s.every((c) => UNITS[l].includes(c)));
        if (line === undefined) continue;
        const eliminate = cands(p, UNITS[line].filter((c) => !UNITS[b].includes(c)), [d]);
        if (eliminate.length)
          yield step("pointing", {
            eliminate,
            highlight: { cells: UNITS[b], candidates: cands(p, s, [d]) },
            why: `In ${unitName(b)}, ${d} can only go on ${unitName(line)}, so ${unitName(line)} has its ${d} inside ${unitName(b)} and nowhere else.`,
          });
      }
    }
}

/** Claiming: a digit's spots on a line all lie in one box, so the rest of that box loses it. */
function* claiming(p: Position): Generator<Step> {
  for (const line of [...ROWS, ...COLS])
    for (const d of DIGITS) {
      const s = spots(p, line, d);
      if (s.length < 2) continue;
      const b = 18 + box(s[0]);
      if (!s.every((c) => UNITS[b].includes(c))) continue;
      const eliminate = cands(p, UNITS[b].filter((c) => !UNITS[line].includes(c)), [d]);
      if (eliminate.length)
        yield step("claiming", {
          eliminate,
          highlight: { cells: UNITS[line], candidates: cands(p, s, [d]) },
          why: `In ${unitName(line)}, ${d} can only go inside ${unitName(b)}, so ${unitName(b)} has its ${d} on ${unitName(line)} and nowhere else.`,
        });
    }
}

/** n cells in a unit holding only n digits between them: the unit's other cells lose those digits. */
const nakedSubset = (n: number, technique: string): Finder => function* (p) {
  for (let u = 0; u < 27; u++) {
    const open = UNITS[u].filter((c) => !p.values[c] && popcount(p.cands[c]) <= n);
    for (const cells of combinations(open, n)) {
      const mask = cells.reduce((m, c) => m | p.cands[c], 0);
      if (popcount(mask) !== n) continue;
      const eliminate = cands(p, UNITS[u].filter((c) => !cells.includes(c)), digitsOf(mask));
      if (eliminate.length)
        yield step(technique, {
          eliminate,
          highlight: { cells, candidates: cands(p, cells, DIGITS) },
          why: `${cellList(cells)} hold only ${list(digitsOf(mask))} between them, so those digits fill those cells and no other cell of ${unitName(u)} can have them.`,
        });
    }
  }
};

/** n digits confined to the same n cells of a unit: those cells lose every other digit. */
const hiddenSubset = (n: number, technique: string): Finder => function* (p) {
  for (let u = 0; u < 27; u++) {
    const open = DIGITS.filter((d) => { const k = spots(p, u, d).length; return k >= 2 && k <= n; });
    for (const ds of combinations(open, n)) {
      const cells = [...new Set(ds.flatMap((d) => spots(p, u, d)))];
      if (cells.length !== n) continue;
      const keep = ds.reduce((m, d) => m | (1 << d), 0);
      const eliminate = cells.flatMap((cell) => digitsOf(p.cands[cell] & ~keep).map((digit) => ({ cell, digit })));
      if (eliminate.length)
        yield step(technique, {
          eliminate,
          highlight: { cells, candidates: cands(p, cells, ds) },
          why: `In ${unitName(u)}, ${list(ds)} fit only in ${cellList(cells)}, so those cells hold those digits and nothing else.`,
        });
    }
  }
};

// ---- Tier 3: fish and wings -----------------------------------------------

const lineName = (u: number) => (u < 9 ? `${u + 1}` : `${u - 8}`);
const linesName = (us: number[]) => `${us[0] < 9 ? "rows" : "columns"} ${list(us.map(lineName))}`;

/**
 * Basic fish of size n (X-Wing, Swordfish, Jellyfish): n rows whose spots for a
 * digit fall in the same n columns. The digit must be in those columns within
 * those rows, so the columns lose it everywhere else. And the same with rows and
 * columns swapped.
 */
const fish = (n: number, technique: string): Finder => function* (p) {
  for (const d of DIGITS)
    for (const [bases, covers] of [[ROWS, COLS], [COLS, ROWS]]) {
      const lines = bases.filter((l) => { const k = spots(p, l, d).length; return k >= 2 && k <= n; });
      for (const base of combinations(lines, n)) {
        const baseCells = base.flatMap((l) => spots(p, l, d));
        const cover = [...new Set(baseCells.map((c) => covers.find((u) => UNITS[u].includes(c))!))].sort((a, b) => a - b);
        if (cover.length !== n) continue;
        const eliminate = cover.flatMap((u) => spots(p, u, d)).filter((c) => !baseCells.includes(c)).map((cell) => ({ cell, digit: d }));
        if (eliminate.length)
          yield step(technique, {
            eliminate,
            highlight: { cells: baseCells, candidates: cands(p, baseCells, [d]) },
            why: `In ${linesName(base)}, ${d} fits only in ${linesName(cover)}. So ${linesName(cover)} each get their ${d} from ${linesName(base)}, and nowhere else.`,
          });
      }
    }
};

/** Every conjugate pair for d in the given units: two spots, one of which must hold it. */
function strongLinks(p: Position, d: number, units: number[]): { u: number; ends: [number, number] }[] {
  const out: { u: number; ends: [number, number] }[] = [];
  for (const u of units) {
    const s = spots(p, u, d);
    if (s.length === 2) out.push({ u, ends: [s[0], s[1]] });
  }
  return out;
}
const flips = (e: [number, number]): [number, number][] => [e, [e[1], e[0]]];

/**
 * Skyscraper: two parallel conjugate pairs for a digit sharing one end's line (the
 * base). One of the two far ends (the tops) must hold the digit, so a cell seeing
 * both tops loses it.
 */
function* skyscraper(p: Position): Generator<Step> {
  for (const d of DIGITS)
    for (const [lines, cross] of [[ROWS, col], [COLS, row]] as const)
      for (const [a, b] of combinations(strongLinks(p, d, lines), 2))
        for (const [baseA, topA] of flips(a.ends))
          for (const [baseB, topB] of flips(b.ends)) {
            if (cross(baseA) !== cross(baseB) || cross(topA) === cross(topB)) continue;
            const cells = [...a.ends, ...b.ends];
            const eliminate = seeingAll(p, [topA, topB], d, cells);
            if (eliminate.length)
              yield step("skyscraper", {
                eliminate,
                highlight: { cells, candidates: cands(p, cells, [d]) },
                why: `${cap(unitName(a.u))} and ${unitName(b.u)} each have ${d} in just two cells, and ${cellName(baseA)} and ${cellName(baseB)} are in line, so at most one of them is ${d}. So ${cellName(topA)} or ${cellName(topB)} is ${d}, and a cell that sees both cannot be.`,
              });
          }
}

/**
 * 2-String Kite: a row conjugate pair and a column conjugate pair for a digit, one
 * end of each in the same box. One of the two far ends must hold the digit, so a
 * cell seeing both loses it.
 */
function* twoStringKite(p: Position): Generator<Step> {
  for (const d of DIGITS)
    for (const r of strongLinks(p, d, ROWS))
      for (const c of strongLinks(p, d, COLS))
        for (const [rNear, rFar] of flips(r.ends))
          for (const [cNear, cFar] of flips(c.ends)) {
            const cells = [rNear, rFar, cNear, cFar];
            if (new Set(cells).size !== 4 || box(rNear) !== box(cNear) || box(rFar) === box(cFar)) continue;
            const eliminate = seeingAll(p, [rFar, cFar], d, cells);
            if (eliminate.length)
              yield step("2-string-kite", {
                eliminate,
                highlight: { cells, candidates: cands(p, cells, [d]) },
                why: `${d} has two places in ${unitName(r.u)} and two in ${unitName(c.u)}. ${cellName(rNear)} and ${cellName(cNear)} share a box, so they are not both ${d}: ${cellName(rFar)} or ${cellName(cFar)} is, and a cell that sees both cannot be.`,
              });
          }
}

/**
 * Empty Rectangle: in some box a digit's spots all lie on one row r and one column
 * c (the hinge), not all on one line. With a conjugate pair on a column outside the
 * box, one end on row r and the other on row q: either that far end holds the
 * digit, or the box's must be in column c. Either way cell (q, c) loses it. Same
 * with rows and columns swapped.
 */
function* emptyRectangle(p: Position): Generator<Step> {
  for (const d of DIGITS)
    for (let b = 0; b < 9; b++) {
      const s = spots(p, 18 + b, d);
      if (s.length < 2 || new Set(s.map(row)).size === 1 || new Set(s.map(col)).size === 1) continue;
      for (const hr of new Set(s.map(row)))
        for (const hc of new Set(s.map(col))) {
          if (!s.every((x) => row(x) === hr || col(x) === hc)) continue;
          const found = (near: number, far: number, target: number, link: number) =>
            step("empty-rectangle", {
              eliminate: [{ cell: target, digit: d }],
              highlight: { cells: [...s, near, far], candidates: cands(p, [...s, near, far], [d]) },
              why: `In box ${b + 1}, ${d} lies only on row ${hr + 1} and column ${hc + 1}. In ${unitName(link)}, ${d} is at ${cellName(near)} or ${cellName(far)}. If ${cellName(far)} is not ${d}, ${cellName(near)} is, which pushes box ${b + 1}'s ${d} onto ${row(near) === hr ? `column ${hc + 1}` : `row ${hr + 1}`}. Either way ${cellName(target)} is not ${d}.`,
            });
          // A column conjugate pair outside the box's stack, one end on row hr.
          for (const { u, ends } of strongLinks(p, d, COLS))
            for (const [near, far] of flips(ends)) {
              if (row(near) !== hr || Math.floor(col(near) / 3) === b % 3 || Math.floor(row(far) / 3) === Math.floor(b / 3)) continue;
              const target = row(far) * 9 + hc;
              if (has(p, target, d)) yield found(near, far, target, u);
            }
          // A row conjugate pair outside the box's band, one end on column hc.
          for (const { u, ends } of strongLinks(p, d, ROWS))
            for (const [near, far] of flips(ends)) {
              if (col(near) !== hc || Math.floor(row(near) / 3) === Math.floor(b / 3) || Math.floor(col(far) / 3) === b % 3) continue;
              const target = hr * 9 + col(far);
              if (has(p, target, d)) yield found(near, far, target, u);
            }
        }
    }
}

const bivalue = (p: Position) => Array.from({ length: 81 }, (_, c) => c).filter((c) => popcount(p.cands[c]) === 2);

/**
 * XY-Wing: a pivot {x,y} seeing pincers {x,z} and {y,z}. Whichever the pivot is,
 * one pincer is z, so a cell seeing both pincers loses z.
 */
function* xyWing(p: Position): Generator<Step> {
  const bv = bivalue(p);
  for (const pivot of bv) {
    const [x, y] = digitsOf(p.cands[pivot]);
    const wings = bv.filter((c) => c !== pivot && sees(c, pivot));
    for (const a of wings)
      for (const b of wings) {
        const ma = p.cands[a], mb = p.cands[b];
        if (!(ma & (1 << x)) || ma & (1 << y) || !(mb & (1 << y)) || mb & (1 << x)) continue;
        const z = ma & ~(1 << x);
        if (z !== (mb & ~(1 << y))) continue;
        const digit = digitsOf(z)[0];
        const eliminate = seeingAll(p, [a, b], digit, [pivot, a, b]);
        if (eliminate.length)
          yield step("xy-wing", {
            eliminate,
            highlight: { cells: [pivot, a, b], candidates: cands(p, [pivot, a, b], DIGITS) },
            why: `The pivot ${cellName(pivot)} is ${x} or ${y}. If ${x}, ${cellName(a)} ${setOf(ma)} is ${digit}; if ${y}, ${cellName(b)} ${setOf(mb)} is. One of them is ${digit}, so a cell that sees both cannot be.`,
          });
      }
  }
}

/**
 * W-Wing: two cells {x,y} that do not see each other, joined by a conjugate pair
 * on x whose ends each see one of them. One of the pair is x, so one of the two
 * cells is y, and a cell seeing both loses y.
 */
function* wWing(p: Position): Generator<Step> {
  for (const [a, b] of combinations(bivalue(p), 2)) {
    if (p.cands[a] !== p.cands[b] || sees(a, b)) continue;
    for (const [x, y] of [digitsOf(p.cands[a]), digitsOf(p.cands[a]).reverse()])
      for (const { u, ends: [e, f] } of strongLinks(p, x, UNITS.map((_, i) => i))) {
        if ([e, f].some((c) => c === a || c === b)) continue;
        if (!((sees(e, a) && sees(f, b)) || (sees(e, b) && sees(f, a)))) continue;
        const eliminate = seeingAll(p, [a, b], y);
        if (eliminate.length)
          yield step("w-wing", {
            eliminate,
            highlight: { cells: [a, b, e, f], candidates: [...cands(p, [a, b], [x, y]), ...cands(p, [e, f], [x])] },
            why: `${cellName(a)} and ${cellName(b)} are both ${setOf(p.cands[a])}. In ${unitName(u)}, ${x} is at ${cellName(e)} or ${cellName(f)}, and each sees one of them, so they cannot both be ${x}. One of them is ${y}, so a cell that sees both cannot be.`,
          });
      }
  }
}

/** XYZ-Wing: a pivot {x,y,z} seeing pincers {x,z} and {y,z}. A cell seeing all three loses z. */
function* xyzWing(p: Position): Generator<Step> {
  const bv = bivalue(p);
  for (let pivot = 0; pivot < 81; pivot++) {
    if (popcount(p.cands[pivot]) !== 3) continue;
    const wings = bv.filter((c) => sees(c, pivot) && (p.cands[c] & ~p.cands[pivot]) === 0);
    for (const [a, b] of combinations(wings, 2)) {
      if (p.cands[a] === p.cands[b]) continue;
      const z = p.cands[a] & p.cands[b];
      if (popcount(z) !== 1) continue;
      const digit = digitsOf(z)[0];
      const eliminate = seeingAll(p, [pivot, a, b], digit);
      if (eliminate.length)
        yield step("xyz-wing", {
          eliminate,
          highlight: { cells: [pivot, a, b], candidates: cands(p, [pivot, a, b], DIGITS) },
          why: `The pivot ${cellName(pivot)} ${setOf(p.cands[pivot])} sees ${cellName(a)} ${setOf(p.cands[a])} and ${cellName(b)} ${setOf(p.cands[b])}. Whatever the pivot is, one of the three is ${digit}, so a cell that sees all three cannot be.`,
        });
    }
  }
}

// ---- Tier 4: coloring ------------------------------------------------------

/**
 * Simple Coloring: link every conjugate pair of a digit (a unit where it has
 * exactly two cells) and colour each connected group in two alternating colours.
 * One colour holds the digit in every one of its cells, the other in none.
 * Color wrap: two cells of one colour see each other, so that colour is the one
 * with none, and all its cells lose the digit. Color trap: a cell outside the
 * group that sees both colours cannot hold the digit.
 */
function* simpleColoring(p: Position): Generator<Step> {
  for (const d of DIGITS) {
    const next = new Map<number, number[]>();
    for (const { ends: [a, b] } of strongLinks(p, d, UNITS.map((_, i) => i))) {
      next.set(a, [...(next.get(a) ?? []), b]);
      next.set(b, [...(next.get(b) ?? []), a]);
    }
    const colour = new Map<number, 0 | 1>();
    for (const root of next.keys()) {
      if (colour.has(root)) continue;
      const group = [root];
      colour.set(root, 0);
      for (let i = 0; i < group.length; i++)
        for (const n of next.get(group[i])!)
          if (!colour.has(n)) { colour.set(n, colour.get(group[i]) === 0 ? 1 : 0); group.push(n); }
      if (group.length < 3) continue;
      const sides = [group.filter((c) => colour.get(c) === 0), group.filter((c) => colour.get(c) === 1)];
      const highlight = { cells: group, candidates: cands(p, sides[0], [d]), others: cands(p, sides[1], [d]) };
      const named = `${cellList(sides[0])} in one colour and ${cellList(sides[1])} in the other`;
      for (const side of sides) {
        const clash = [...combinations(side, 2)].find(([a, b]) => sees(a, b));
        if (clash)
          yield step("simple-coloring", {
            eliminate: side.map((cell) => ({ cell, digit: d })),
            highlight,
            why: `Colour ${d}'s pairs: ${named}. One colour holds every ${d} and the other none. ${cellName(clash[0])} and ${cellName(clash[1])} share a colour and see each other, so that colour cannot be ${d}.`,
          });
      }
      const trapped = seeingAll(p, [], d, group).filter(({ cell }) => sides.every((side) => side.some((c) => sees(cell, c))));
      if (trapped.length)
        yield step("simple-coloring", {
          eliminate: trapped,
          highlight,
          why: `Colour ${d}'s pairs: ${named}. One colour holds every ${d} and the other none, so a cell that sees both colours cannot be ${d}.`,
        });
    }
  }
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// ---- The catalog ------------------------------------------------------------

export type Technique = {
  slug: string;
  name: string;
  tier: number;
  /** Every step this technique can take in the position. */
  all: Finder;
  /** The first of them, or null. */
  find: (p: Position) => Step | null;
};

const t = (slug: string, name: string, tier: number, all: Finder): Technique =>
  ({ slug, name, tier, all, find: (p) => all(p).next().value ?? null });

/** Easiest first: the solver always takes the first that applies, which is what makes it a grader. */
export const TECHNIQUES: Technique[] = [
  t("full-house", "Full House", 1, fullHouse),
  t("naked-single", "Naked Single", 1, nakedSingle),
  t("hidden-single", "Hidden Single", 1, hiddenSingle),
  t("pointing", "Pointing", 2, pointing),
  t("claiming", "Claiming", 2, claiming),
  t("naked-pair", "Naked Pair", 2, nakedSubset(2, "naked-pair")),
  t("hidden-pair", "Hidden Pair", 2, hiddenSubset(2, "hidden-pair")),
  t("naked-triple", "Naked Triple", 2, nakedSubset(3, "naked-triple")),
  t("hidden-triple", "Hidden Triple", 2, hiddenSubset(3, "hidden-triple")),
  t("naked-quad", "Naked Quad", 2, nakedSubset(4, "naked-quad")),
  t("hidden-quad", "Hidden Quad", 2, hiddenSubset(4, "hidden-quad")),
  t("x-wing", "X-Wing", 3, fish(2, "x-wing")),
  t("skyscraper", "Skyscraper", 3, skyscraper),
  t("2-string-kite", "2-String Kite", 3, twoStringKite),
  t("empty-rectangle", "Empty Rectangle", 3, emptyRectangle),
  t("xy-wing", "XY-Wing", 3, xyWing),
  t("w-wing", "W-Wing", 3, wWing),
  t("swordfish", "Swordfish", 3, fish(3, "swordfish")),
  t("xyz-wing", "XYZ-Wing", 3, xyzWing),
  t("jellyfish", "Jellyfish", 3, fish(4, "jellyfish")),
  t("simple-coloring", "Simple Coloring", 4, simpleColoring),
];

export const TIERS = ["", "Easy", "Medium", "Hard", "Advanced"];
/** The tiers in use, easiest first. */
export const TIER_LIST = [...new Set(TECHNIQUES.map((t) => t.tier))];

/** The easiest step available, or null when the catalog is stuck. */
export function nextStep(p: Position): Step | null {
  for (const t of TECHNIQUES) {
    const s = t.find(p);
    if (s) return s;
  }
  return null;
}

export type Grade = {
  /** Solved using the catalog alone. */
  solved: boolean;
  /** Index in TECHNIQUES of the hardest technique needed; -1 if nothing was. */
  difficulty: number;
  /** Slugs of every technique used, easiest first. */
  techniques: string[];
  /** For each technique, the position just before it was first needed, and the step. */
  firstUses: { position: Position; step: Step }[];
};

export function grade(givens: Grid): Grade {
  let p = start(givens);
  const firstUses: Grade["firstUses"] = [];
  const used = new Set<string>();
  for (let s = nextStep(p); s; s = nextStep(p)) {
    if (!used.has(s.technique)) { used.add(s.technique); firstUses.push({ position: p, step: s }); }
    p = apply(p, s);
  }
  const order = TECHNIQUES.map((t) => t.slug).filter((slug) => used.has(slug));
  return {
    solved: p.values.every(Boolean),
    difficulty: TECHNIQUES.findLastIndex((t) => used.has(t.slug)),
    techniques: order,
    firstUses,
  };
}
