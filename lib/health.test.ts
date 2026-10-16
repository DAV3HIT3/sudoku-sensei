import { expect, test } from "vitest";
import { health } from "./health.ts";

const probe = async (countPuzzles: () => Promise<number>) => {
  const res = await health(countPuzzles, 50);
  return { code: res.status, body: await res.json() };
};

test("a database with puzzles is 200 ok, in the runbook's shape", async () => {
  const { code, body } = await probe(async () => 812);
  expect(code).toBe(200);
  expect(body).toEqual({
    status: "ok",
    version: expect.any(String),
    commit: null,
    started: expect.stringMatching(/^\d{4}-\d\d-\d\dT.*Z$/),
    checks: { db: { status: "ok", ms: expect.any(Number), detail: "812 puzzles" } },
  });
  // Docker keeps only the first 4 KB of what the probe prints.
  expect(JSON.stringify(body).length).toBeLessThan(4096);
});

test("a database that is down is 503 down, with its error", async () => {
  const { code, body } = await probe(async () => {
    throw new Error("connect ECONNREFUSED 127.0.0.1:5432\nmore");
  });
  expect(code).toBe(503);
  expect(body.status).toBe("down");
  expect(body.checks.db).toMatchObject({ status: "down", detail: "connect ECONNREFUSED 127.0.0.1:5432" });
});

test("a database that does not answer is 503 within its timeout", async () => {
  const { code, body } = await probe(() => new Promise(() => {}));
  expect(code).toBe(503);
  expect(body.checks.db.detail).toBe("no answer in 50 ms");
});

test("no puzzles is 503: there is nothing to play", async () => {
  const { code, body } = await probe(async () => 0);
  expect(code).toBe(503);
  expect(body.checks.db).toMatchObject({ status: "down", detail: "no puzzles seeded" });
});
