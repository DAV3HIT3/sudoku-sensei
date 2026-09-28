"use server";

import { revalidatePath } from "next/cache";
import { setKnown } from "@/lib/progress";
import { TECHNIQUES } from "@/lib/sudoku/solver";
import { currentUser } from "@/lib/user";

/** Marks a technique as known, or not ("known" is "1" or "0"), from a form on the home page. */
export async function markKnown(form: FormData) {
  const user = await currentUser();
  if (!user) throw new Error("not signed in");
  const slug = form.get("slug");
  if (typeof slug !== "string" || !TECHNIQUES.some((t) => t.slug === slug)) throw new Error("no such technique");
  await setKnown(user.id, slug, form.get("known") === "1");
  revalidatePath("/");
  revalidatePath("/progress");
}
