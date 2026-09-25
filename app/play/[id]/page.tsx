import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame } from "@/lib/games";
import { getPuzzle } from "@/lib/puzzles";
import { currentUser } from "@/lib/user";
import Board from "./Board";

export default async function Play({ params }: PageProps<"/play/[id]">) {
  const { id } = await params;
  const puzzle = /^\d+$/.test(id) ? await getPuzzle(Number(id)) : null;
  if (!puzzle) notFound();
  const user = await currentUser();
  const saved = user ? await getGame(user.id, puzzle.id) : null;
  return (
    <main className="flex flex-1 flex-col items-center gap-4 p-4">
      <header className="flex w-full max-w-[540px] items-baseline justify-between">
        <Link href="/" className="text-sm text-zinc-500 hover:underline">← Puzzles</Link>
        <span className="text-sm text-zinc-500">{puzzle.source}</span>
      </header>
      <Board key={saved?.updatedAt} puzzleId={puzzle.id} givens={puzzle.givens} solution={puzzle.solution} saved={saved} />
    </main>
  );
}
