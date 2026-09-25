import type { NextRequest } from "next/server";
import { saveGame } from "@/lib/games";
import { currentUser } from "@/lib/user";

/**
 * Saves a game from navigator.sendBeacon, which the board uses when the page is
 * being hidden or closed with a save still waiting (a server action can be cut
 * off as the page goes). Everything else saves through the server action.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/games/[id]">) {
  // Server actions refuse cross-site requests by themselves; a route handler has to.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || new URL(origin).host !== host) return new Response("cross-site request", { status: 403 });
  const user = await currentUser();
  if (!user) return new Response("not signed in", { status: 401 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return new Response("bad puzzle id", { status: 400 });
  try {
    const { state, hints } = await req.json();
    await saveGame(user.id, id, state, hints);
    return new Response(null, { status: 204 });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "bad request", { status: 400 });
  }
}
