import { markKnown } from "@/app/actions";

/** A check-mark toggle: "I know this technique", or undo it. */
export default function KnownButton({ slug, name, known }: { slug: string; name: string; known: boolean }) {
  return (
    <form action={markKnown} className="contents">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="known" value={known ? "0" : "1"} />
      <button type="submit" aria-label={known ? `Undo: I know ${name}` : `I know ${name}: skip it`} aria-pressed={known}
        title={known ? `You marked ${name} as known. Undo` : `I know ${name}: skip it`}
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 ${known ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill={known ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="m8 12 3 3 5-6" stroke={known ? "white" : "currentColor"} />
        </svg>
      </button>
    </form>
  );
}
