import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import type { NextConfig } from "next";

// A fingerprint of the solver's source, baked in at build time. Start-up regrades
// the puzzles only when this, or the puzzle file, has changed (lib/puzzles.ts).
const engine = createHash("sha256");
for (const f of readdirSync("lib/sudoku").filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).sort())
  engine.update(f).update(readFileSync(`lib/sudoku/${f}`));

const nextConfig: NextConfig = {
  // A self-contained server directory, so the image carries only what the app imports.
  output: "standalone",
  poweredByHeader: false,
  env: { ENGINE_HASH: engine.digest("hex").slice(0, 16) },
};

export default nextConfig;
