import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { guides } from "@/db/schema";

const DIR = () => path.join(process.cwd(), "content", "guides");

/**
 * Copies content/guides into the guides table on start-up. A file is
 * "<sort>-<slug>.md": a "# Title" line, then the body; its first paragraph is the
 * summary.
 */
export async function seedGuides(): Promise<void> {
  const rows = await Promise.all((await readdir(DIR())).filter((f) => f.endsWith(".md")).map(async (f) => {
    const [, sort, slug] = /^(\d+)-(.+)\.md$/.exec(f) ?? [];
    if (!slug) throw new Error(`content/guides/${f}: name it <sort>-<slug>.md`);
    const md = await readFile(path.join(DIR(), f), "utf8");
    const title = /^# (.+)$/m.exec(md)?.[1];
    if (!title) throw new Error(`content/guides/${f}: no "# Title" line`);
    const body = md.replace(/^# .*\n+/, "").trim();
    return { slug, title, sort: Number(sort), summary: body.split("\n\n")[0], body };
  }));
  if (!rows.length) return;
  await getDb().insert(guides).values(rows).onConflictDoUpdate({
    target: guides.slug,
    set: { title: sql`excluded.title`, sort: sql`excluded.sort`, summary: sql`excluded.summary`, body: sql`excluded.body` },
  });
}

export const listGuides = () => getDb().select().from(guides).orderBy(asc(guides.sort));

export async function getGuide(slug: string) {
  const [g] = await getDb().select().from(guides).where(eq(guides.slug, slug));
  return g ?? null;
}
