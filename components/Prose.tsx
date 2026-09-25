/**
 * Content text: blocks separated by blank lines are paragraphs, and a block whose
 * lines all start with "- " is a list. Nothing else is interpreted.
 */
export default function Prose({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3 leading-relaxed">
      {text.split("\n\n").map((block, i) => {
        const lines = block.split("\n");
        return lines.every((l) => l.startsWith("- ")) ? (
          <ul key={i} className="flex list-disc flex-col gap-1 pl-5">
            {lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}
          </ul>
        ) : (
          <p key={i}>{block}</p>
        );
      })}
    </div>
  );
}
