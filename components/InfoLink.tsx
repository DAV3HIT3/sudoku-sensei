import Link from "next/link";

/** An (i) icon linking to a help page. */
export default function InfoLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} title={label}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-5M12 8h.01" />
      </svg>
    </Link>
  );
}
