/** A word split into letters that can rise from behind a mask (decorative: screen readers get `label`). */
export function Split({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`split ${className ?? ''}`} aria-hidden="true">
      {[...text].map((ch, i) => (
        <span className="ch" key={i}>
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  );
}
