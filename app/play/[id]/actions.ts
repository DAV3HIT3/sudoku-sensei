"use server";

import { getGame, saveGame } from "@/lib/games";
import { currentUser } from "@/lib/user";

async function player() {
  const user = await currentUser();
  if (!user) throw new Error("not signed in");
  return user;
}

export async function save(puzzleId: number, state: unknown) {
  if (!Number.isInteger(puzzleId)) throw new Error("bad puzzle id");
  return saveGame((await player()).id, puzzleId, state);
}

export async function load(puzzleId: number) {
  if (!Number.isInteger(puzzleId)) throw new Error("bad puzzle id");
  return getGame((await player()).id, puzzleId);
}
