import type { NextRequest } from "next/server";
import { sameOrigin } from "@/lib/http";
import { saveLessonStage } from "@/lib/progress";
import { TECHNIQUES } from "@/lib/sudoku/solver";
import { currentUser } from "@/lib/user";

/** Saves a lesson's stage from navigator.sendBeacon, as the page is left with it unsent. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/lessons/[slug]">) {
  if (!sameOrigin(req)) return new Response("cross-site request", { status: 403 });
  const user = await currentUser();
  if (!user) return new Response("not signed in", { status: 401 });
  const { slug } = await ctx.params;
  if (!TECHNIQUES.some((t) => t.slug === slug)) return new Response("no such technique", { status: 404 });
  try {
    const { stage, last } = await req.json();
    if (!Number.isInteger(stage) || stage < 0 || stage > 100) throw new Error("bad lesson stage");
    await saveLessonStage(user.id, slug, stage, last === true);
    return new Response(null, { status: 204 });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "bad request", { status: 400 });
  }
}
