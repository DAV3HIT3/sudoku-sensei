/**
 * Checking a drill: "find the X-Wing here". The player either places a digit (for
 * the singles) or marks candidates to remove. Any real instance of the technique
 * counts, not only the one the solver found first, and so does finding part of
 * one: some of its removals and nothing it doesn't remove.
 */
import { TECHNIQUES, type Candidate, type Position, type Step } from "./solver.ts";

export type Answer = { place: Candidate | null; remove: Candidate[] };
export type Verdict = { correct: boolean; step: Step };

/** Whether the technique places digits (the singles) rather than removing candidates. */
export const placesDigits = (step: Step) => step.place.length > 0;

export function checkDrill(position: Position, technique: string, answer: Answer): Verdict {
  const instances = [...TECHNIQUES.find((t) => t.slug === technique)!.all(position)];
  const same = (a: Candidate, b: Candidate) => a.cell === b.cell && a.digit === b.digit;
  const match = placesDigits(instances[0])
    ? answer.place && instances.find((s) => s.place.some((p) => same(p, answer.place!)))
    : answer.remove.length > 0 && instances.find((s) => answer.remove.every((r) => s.eliminate.some((e) => same(e, r))));
  return match ? { correct: true, step: match } : { correct: false, step: instances[0] };
}
