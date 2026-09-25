/**
 * The human-style solver: a position (digits plus the candidates still open), one
 * function per technique that finds the next step it can take, and the order a
 * person would try them in.
 */
import { ALL, box, candidates, col, PEERS, popcount, row, type Grid } from "./grid.ts";

export type Candidate = { cell: number; digit: number };

/** One deduction. Drives hints, grading, lessons and drills alike. */
export type Step = {
  technique: string;
  place: Candidate[];
  eliminate: Candidate[];
  /** What to draw: the cells the pattern lives in and its key candidates. */
  highlight: { cells: number[]; candidates: Candidate[] };
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
const ROWS = UNITS.slice(0, 9), COLS = UNITS.slice(9, 18), BOXES = UNITS.slice(18);
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const PEER_SET = PEERS.map((p) => new Set(p));

export const sees = (a: number, b: number) => PEER_SET[a].has(b);
const has = (p: Position, cell: number, d: number) => (p.cands[cell] & (1 << d)) !== 0;
const digitsOf = (mask: number) => DIGITS.filter((d) => mask & (1 << d));
/** The cells of a unit where d is still a candidate. */
const spots = (p: Position, unit: number[], d: number) => unit.filter((c) => has(p, c, d));

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

const step = (technique: string, s: Partial<Step>): Step => ({
  technique, place: [], eliminate: [], highlight: { cells: [], candidates: [] }, ...s,
});

// ---- Tier 1: singles -------------------------------------------------------

function fullHouse(p: Position): Step | null {
  for (const unit of UNITS) {
    const empty = unit.filter((c) => !p.values[c]);
    if (empty.length !== 1) continue;
    const used = unit.reduce((m, c) => m | (1 << p.values[c]), 0);
    const digit = digitsOf(ALL & ~used)[0];
    return step("full-house", { place: [{ cell: empty[0], digit }], highlight: { cells: unit, candidates: [] } });
  }
  return null;
}

function nakedSingle(p: Position): Step | null {
  for (let c = 0; c < 81; c++)
    if (!p.values[c] && popcount(p.cands[c]) === 1) {
      const digit = digitsOf(p.cands[c])[0];
      return step("naked-single", { place: [{ cell: c, digit }], highlight: { cells: [c], candidates: [] } });
    }
  return null;
}

function hiddenSingle(p: Position): Step | null {
  // Boxes first: that is where people find them.
  for (const unit of [...BOXES, ...ROWS, ...COLS])
    for (const d of DIGITS) {
      const s = spots(p, unit, d);
      if (s.length === 1)
        return step("hidden-single", { place: [{ cell: s[0], digit: d }], highlight: { cells: unit, candidates: [{ cell: s[0], digit: d }] } });
    }
  return null;
}

// ---- Tier 2: intersections and subsets ------------------------------------

/** Pointing: a digit's spots in a box all lie on one line, so the rest of that line loses it. */
function pointing(p: Position): Step | null {
  for (const b of BOXES)
    for (const d of DIGITS) {
      const s = spots(p, b, d);
      if (s.length < 2) continue;
      for (const lines of [ROWS, COLS]) {
        const line = lines.find((l) => s.every((c) => l.includes(c)));
        if (!line) continue;
        const eliminate = line.filter((c) => !b.includes(c) && has(p, c, d)).map((cell) => ({ cell, digit: d }));
        if (eliminate.length)
          return step("pointing", { eliminate, highlight: { cells: b, candidates: s.map((cell) => ({ cell, digit: d })) } });
      }
    }
  return null;
}

/** Claiming: a digit's spots on a line all lie in one box, so the rest of that box loses it. */
function claiming(p: Position): Step | null {
  for (const line of [...ROWS, ...COLS])
    for (const d of DIGITS) {
      const s = spots(p, line, d);
      if (s.length < 2) continue;
      const b = BOXES[box(s[0])];
      if (!s.every((c) => b.includes(c))) continue;
      const eliminate = b.filter((c) => !line.includes(c) && has(p, c, d)).map((cell) => ({ cell, digit: d }));
      if (eliminate.length)
        return step("claiming", { eliminate, highlight: { cells: line, candidates: s.map((cell) => ({ cell, digit: d })) } });
    }
  return null;
}

/** n cells in a unit holding only n digits between them: the unit's other cells lose those digits. */
const nakedSubset = (n: number, technique: string) => (p: Position): Step | null => {
  for (const unit of UNITS) {
    const open = unit.filter((c) => !p.values[c] && popcount(p.cands[c]) <= n);
    for (const cells of combinations(open, n)) {
      const mask = cells.reduce((m, c) => m | p.cands[c], 0);
      if (popcount(mask) !== n) continue;
      const eliminate = unit
        .filter((c) => !cells.includes(c))
        .flatMap((cell) => digitsOf(mask).filter((d) => has(p, cell, d)).map((digit) => ({ cell, digit })));
      if (eliminate.length)
        return step(technique, {
          eliminate,
          highlight: { cells, candidates: cells.flatMap((cell) => digitsOf(p.cands[cell]).map((digit) => ({ cell, digit }))) },
        });
    }
  }
  return null;
};

/** n digits confined to the same n cells of a unit: those cells lose every other digit. */
const hiddenSubset = (n: number, technique: string) => (p: Position): Step | null => {
  for (const unit of UNITS) {
    const open = DIGITS.filter((d) => { const k = spots(p, unit, d).length; return k >= 2 && k <= n; });
    for (const ds of combinations(open, n)) {
      const cells = [...new Set(ds.flatMap((d) => spots(p, unit, d)))];
      if (cells.length !== n) continue;
      const keep = ds.reduce((m, d) => m | (1 << d), 0);
      const eliminate = cells.flatMap((cell) => digitsOf(p.cands[cell] & ~keep).map((digit) => ({ cell, digit })));
      if (eliminate.length)
        return step(technique, {
          eliminate,
          highlight: { cells, candidates: cells.flatMap((cell) => ds.filter((d) => has(p, cell, d)).map((digit) => ({ cell, digit }))) },
        });
    }
  }
  return null;
};

// ---- Tier 3: fish and wings -----------------------------------------------

/**
 * Basic fish of size n (X-Wing, Swordfish, Jellyfish): n rows whose spots for a
 * digit fall in the same n columns. The digit must be in those columns within
 * those rows, so the columns lose it everywhere else. And the same with rows and
 * columns swapped.
 */
const fish = (n: number, technique: string) => (p: Position): Step | null => {
  for (const d of DIGITS)
    for (const [bases, covers] of [[ROWS, COLS], [COLS, ROWS]]) {
      const lines = bases.filter((l) => { const k = spots(p, l, d).length; return k >= 2 && k <= n; });
      for (const base of combinations(lines, n)) {
        const baseCells = base.flatMap((l) => spots(p, l, d));
        const coverIdx = [...new Set(baseCells.map((c) => covers.findIndex((u) => u.includes(c))))];
        if (coverIdx.length !== n) continue;
        const eliminate = coverIdx
          .flatMap((i) => spots(p, covers[i], d))
          .filter((c) => !baseCells.includes(c))
          .map((cell) => ({ cell, digit: d }));
        if (eliminate.length)
          return step(technique, { eliminate, highlight: { cells: baseCells, candidates: baseCells.map((cell) => ({ cell, digit: d })) } });
      }
    }
  return null;
};

/** Every conjugate pair: units where d has exactly two spots, one of which must hold it. */
function strongLinks(p: Position, d: number, units = UNITS): [number, number][] {
  const out: [number, number][] = [];
  for (const u of units) {
    const s = spots(p, u, d);
    if (s.length === 2) out.push([s[0], s[1]]);
  }
  return out;
}

/**
 * Skyscraper: two parallel conjugate pairs for a digit sharing one end's line (the
 * base). One of the two far ends (the tops) must hold the digit, so a cell seeing
 * both tops loses it.
 */
function skyscraper(p: Position): Step | null {
  for (const d of DIGITS)
    for (const [lines, cross] of [[ROWS, col], [COLS, row]] as const) {
      const pairs = strongLinks(p, d, lines);
      for (const [a, b] of combinations(pairs, 2))
        for (const [baseA, topA] of [a, [a[1], a[0]]])
          for (const [baseB, topB] of [b, [b[1], b[0]]]) {
            if (cross(baseA) !== cross(baseB) || cross(topA) === cross(topB)) continue;
            const eliminate = seeingAll(p, [topA, topB], d, [...a, ...b]);
            if (eliminate.length)
              return step("skyscraper", { eliminate, highlight: { cells: [...a, ...b], candidates: [...a, ...b].map((cell) => ({ cell, digit: d })) } });
          }
    }
  return null;
}

/**
 * 2-String Kite: a row conjugate pair and a column conjugate pair for a digit, one
 * end of each in the same box. One of the two far ends must hold the digit, so a
 * cell seeing both loses it.
 */
function twoStringKite(p: Position): Step | null {
  for (const d of DIGITS) {
    const rowPairs = strongLinks(p, d, ROWS), colPairs = strongLinks(p, d, COLS);
    for (const r of rowPairs)
      for (const c of colPairs)
        for (const [rNear, rFar] of [r, [r[1], r[0]]])
          for (const [cNear, cFar] of [c, [c[1], c[0]]]) {
            const cells = [rNear, rFar, cNear, cFar];
            if (new Set(cells).size !== 4 || box(rNear) !== box(cNear) || box(rFar) === box(cFar)) continue;
            const eliminate = seeingAll(p, [rFar, cFar], d, cells);
            if (eliminate.length)
              return step("2-string-kite", { eliminate, highlight: { cells, candidates: cells.map((cell) => ({ cell, digit: d })) } });
          }
  }
  return null;
}

/**
 * Empty Rectangle: in some box a digit's spots all lie on one row r and one column
 * c (the hinge), not all on one line. With a conjugate pair on a column outside the
 * box, one end on row r and the other on row q: either that far end holds the
 * digit, or the box's must be in column c. Either way cell (q, c) loses it. Same
 * with rows and columns swapped.
 */
function emptyRectangle(p: Position): Step | null {
  for (const d of DIGITS)
    for (let b = 0; b < 9; b++) {
      const s = spots(p, BOXES[b], d);
      if (s.length < 2 || new Set(s.map(row)).size === 1 || new Set(s.map(col)).size === 1) continue;
      for (const hr of new Set(s.map(row)))
        for (const hc of new Set(s.map(col))) {
          if (!s.every((x) => row(x) === hr || col(x) === hc)) continue;
          // A column conjugate pair outside the box's stack, one end on row hr.
          for (const [x, y] of strongLinks(p, d, COLS))
            for (const [near, far] of [[x, y], [y, x]]) {
              if (row(near) !== hr || Math.floor(col(near) / 3) === b % 3 || Math.floor(row(far) / 3) === Math.floor(b / 3)) continue;
              const target = row(far) * 9 + hc;
              if (has(p, target, d))
                return step("empty-rectangle", {
                  eliminate: [{ cell: target, digit: d }],
                  highlight: { cells: [...s, near, far], candidates: [...s, near, far].map((cell) => ({ cell, digit: d })) },
                });
            }
          // A row conjugate pair outside the box's band, one end on column hc.
          for (const [x, y] of strongLinks(p, d, ROWS))
            for (const [near, far] of [[x, y], [y, x]]) {
              if (col(near) !== hc || Math.floor(row(near) / 3) === Math.floor(b / 3) || Math.floor(col(far) / 3) === b % 3) continue;
              const target = hr * 9 + col(far);
              if (has(p, target, d))
                return step("empty-rectangle", {
                  eliminate: [{ cell: target, digit: d }],
                  highlight: { cells: [...s, near, far], candidates: [...s, near, far].map((cell) => ({ cell, digit: d })) },
                });
            }
        }
    }
  return null;
}

const bivalue = (p: Position) => Array.from({ length: 81 }, (_, c) => c).filter((c) => popcount(p.cands[c]) === 2);

/**
 * XY-Wing: a pivot {x,y} seeing pincers {x,z} and {y,z}. Whichever the pivot is,
 * one pincer is z, so a cell seeing both pincers loses z.
 */
function xyWing(p: Position): Step | null {
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
          return step("xy-wing", {
            eliminate,
            highlight: { cells: [pivot, a, b], candidates: [pivot, a, b].flatMap((cell) => digitsOf(p.cands[cell]).map((digit) => ({ cell, digit }))) },
          });
      }
  }
  return null;
}

/** XYZ-Wing: a pivot {x,y,z} seeing pincers {x,z} and {y,z}. A cell seeing all three loses z. */
function xyzWing(p: Position): Step | null {
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
        return step("xyz-wing", {
          eliminate,
          highlight: { cells: [pivot, a, b], candidates: [pivot, a, b].flatMap((cell) => digitsOf(p.cands[cell]).map((digit) => ({ cell, digit }))) },
        });
    }
  }
  return null;
}

/**
 * W-Wing: two cells {x,y} that do not see each other, joined by a conjugate pair
 * on x whose ends each see one of them. One of the pair is x, so one of the two
 * cells is y, and a cell seeing both loses y.
 */
function wWing(p: Position): Step | null {
  const bv = bivalue(p);
  for (const [a, b] of combinations(bv, 2)) {
    if (p.cands[a] !== p.cands[b] || sees(a, b)) continue;
    for (const [x, y] of [digitsOf(p.cands[a]), digitsOf(p.cands[a]).reverse()])
      for (const [e, f] of strongLinks(p, x)) {
        if ([e, f].some((c) => c === a || c === b)) continue;
        if (!((sees(e, a) && sees(f, b)) || (sees(e, b) && sees(f, a)))) continue;
        const eliminate = seeingAll(p, [a, b], y);
        if (eliminate.length)
          return step("w-wing", {
            eliminate,
            highlight: {
              cells: [a, b, e, f],
              candidates: [...[a, b].flatMap((cell) => [x, y].map((digit) => ({ cell, digit }))), { cell: e, digit: x }, { cell: f, digit: x }],
            },
          });
      }
  }
  return null;
}

// ---- The catalog ------------------------------------------------------------

export type Technique = { slug: string; name: string; tier: number; find: (p: Position) => Step | null };

/** Easiest first: the solver always takes the first that applies, which is what makes it a grader. */
export const TECHNIQUES: Technique[] = [
  { slug: "full-house", name: "Full House", tier: 1, find: fullHouse },
  { slug: "naked-single", name: "Naked Single", tier: 1, find: nakedSingle },
  { slug: "hidden-single", name: "Hidden Single", tier: 1, find: hiddenSingle },
  { slug: "pointing", name: "Pointing", tier: 2, find: pointing },
  { slug: "claiming", name: "Claiming", tier: 2, find: claiming },
  { slug: "naked-pair", name: "Naked Pair", tier: 2, find: nakedSubset(2, "naked-pair") },
  { slug: "hidden-pair", name: "Hidden Pair", tier: 2, find: hiddenSubset(2, "hidden-pair") },
  { slug: "naked-triple", name: "Naked Triple", tier: 2, find: nakedSubset(3, "naked-triple") },
  { slug: "hidden-triple", name: "Hidden Triple", tier: 2, find: hiddenSubset(3, "hidden-triple") },
  { slug: "naked-quad", name: "Naked Quad", tier: 2, find: nakedSubset(4, "naked-quad") },
  { slug: "hidden-quad", name: "Hidden Quad", tier: 2, find: hiddenSubset(4, "hidden-quad") },
  { slug: "x-wing", name: "X-Wing", tier: 3, find: fish(2, "x-wing") },
  { slug: "skyscraper", name: "Skyscraper", tier: 3, find: skyscraper },
  { slug: "2-string-kite", name: "2-String Kite", tier: 3, find: twoStringKite },
  { slug: "empty-rectangle", name: "Empty Rectangle", tier: 3, find: emptyRectangle },
  { slug: "xy-wing", name: "XY-Wing", tier: 3, find: xyWing },
  { slug: "w-wing", name: "W-Wing", tier: 3, find: wWing },
  { slug: "swordfish", name: "Swordfish", tier: 3, find: fish(3, "swordfish") },
  { slug: "xyz-wing", name: "XYZ-Wing", tier: 3, find: xyzWing },
  { slug: "jellyfish", name: "Jellyfish", tier: 3, find: fish(4, "jellyfish") },
];

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
