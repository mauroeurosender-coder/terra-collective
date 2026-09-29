import type { Decoration as Kind } from "@/lib/themes";

const glyph: Record<Exclude<Kind, "none">, string[]> = {
  snow: ["❄", "❅", "❆"],
  confetti: ["▲", "■", "●", "▬"],
  hearts: ["♥", "♡", "♥"],
  petals: ["❀", "✿", "❁"],
};
const colors: Record<Exclude<Kind, "none">, string[]> = {
  snow: ["#9fc3b3", "#c8dcd2", "#b7cfe0"],
  confetti: ["#2e5aac", "#ef6a3f", "#e9b949", "#6b7f3a", "#e7b8b0"],
  hearts: ["#b8325a", "#e7b8b0", "#f3a6b8"],
  petals: ["#e7b8b0", "#ecebf8", "#e9b949", "#f5e8f2"],
};

/** Light seasonal particles drifting down the page. Decorative only: hidden from screen readers and for reduced motion. */
export function Decoration({ kind }: { kind: Exclude<Kind, "none"> | Kind }) {
  if (kind === "none") return null;
  const n = kind === "confetti" ? 18 : 14;
  return (
    <div aria-hidden className="tc-deco pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {Array.from({ length: n }, (_, i) => {
        const left = (i * 73) % 100;
        const size = kind === "snow" ? 14 + ((i * 7) % 14) : 10 + ((i * 5) % 10);
        const duration = 11 + ((i * 13) % 12);
        const delay = -((i * 17) % 20);
        return (
          <span
            key={i}
            className="tc-deco-p absolute top-0"
            style={{
              left: `${left}%`,
              fontSize: size,
              color: colors[kind][i % colors[kind].length],
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              textShadow: undefined,
              opacity: kind === "snow" ? 0.9 : 0.75,
            }}
          >
            {glyph[kind][i % glyph[kind].length]}
          </span>
        );
      })}
    </div>
  );
}
