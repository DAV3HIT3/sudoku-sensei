import type { NextRequest } from "next/server";

/**
 * Whether a request comes from this site's own pages. Server actions check this by
 * themselves; route handlers that change data (the beacon saves) have to.
 */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return !!origin && new URL(origin).host === host;
}
