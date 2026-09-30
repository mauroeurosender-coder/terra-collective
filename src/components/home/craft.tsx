import type { L } from "@/lib/types";

/** Slowly rotating circular "hand stamp" with text around the edge. */
export function RotatingSeal({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className} aria-hidden>
      <svg viewBox="0 0 120 120" className="tc-spin h-full w-full">
        <defs>
          <path id="seal-circle" d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0" />
        </defs>
        <circle cx="60" cy="60" r="57" fill="var(--color-cream)" stroke="var(--color-azulejo)" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="33" fill="none" stroke="var(--color-azulejo)" strokeWidth="1" strokeDasharray="2 3" />
        <text className="fill-azulejo text-[10.5px] font-semibold tracking-[0.18em] uppercase">
          <textPath href="#seal-circle">{text.repeat(2)}</textPath>
        </text>
        <g transform="translate(40 52)" fill="none" stroke="var(--color-coral)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8c7-8 21-9 30-2-8 7-22 7-30 2Z" />
          <path d="M6 8 0 3v10Z" />
          <circle cx="31" cy="7" r="1" fill="var(--color-coral)" />
        </g>
      </svg>
    </div>
  );
}

/** Endless ribbon of short phrases in handwriting. Pauses for reduced motion. */
export function Ribbon({ items, lang }: { items: L[]; lang: "en" | "pt" }) {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={hidden || undefined}>
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-8 whitespace-nowrap">
          <span className="hand text-3xl text-white md:text-4xl">{it[lang]}</span>
          <span className="text-mustard">✦</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="relative overflow-hidden border-y border-azulejo-deep/20 bg-azulejo py-4 text-white">
      <div className="tc-marquee flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

/** A dashed, hand-drawn looking path used to connect story steps. */
export function DottedPath({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1000 60" preserveAspectRatio="none" className={className} aria-hidden>
      <path d="M0 30c80-26 160-26 250 0s170 26 250 0 170-26 250 0 170 26 250 0" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" />
    </svg>
  );
}

const flags: Record<string, [string, string]> = {
  PT: ["#046A38", "#DA291C"], ES: ["#AA151B", "#F1BF00"], FR: ["#002395", "#ED2939"], DE: ["#000000", "#DD0000"], GB: ["#012169", "#C8102E"],
  US: ["#3C3B6E", "#B22234"], NL: ["#AE1C28", "#21468B"], IT: ["#009246", "#CE2B37"], BE: ["#000000", "#FDDA24"], IE: ["#169B62", "#FF883E"],
};

/** Postage stamp with a two-colour band for the reviewer's country and a wavy postmark. */
export function Stamp({ country, className }: { country: string; className?: string }) {
  const [a, b] = flags[country] ?? ["#2e5aac", "#e8704a"];
  return (
    <div className={className} aria-hidden>
      <svg viewBox="0 0 90 64" className="h-full w-full overflow-visible">
        <rect x="30" y="4" width="54" height="56" rx="2" fill="var(--color-paper)" stroke="var(--color-line)" strokeDasharray="3 2" strokeWidth="2" />
        <rect x="36" y="10" width="42" height="44" fill="var(--color-azulejo-tint)" />
        <rect x="36" y="10" width="21" height="10" fill={a} />
        <rect x="57" y="10" width="21" height="10" fill={b} />
        <path d="M44 38c5-6 16-7 23-2-6 6-17 6-23 2Z M44 38l-5-4v8Z" fill="none" stroke="var(--color-azulejo)" strokeWidth="1.5" strokeLinejoin="round" />
        <text x="57" y="51" textAnchor="middle" className="fill-ink text-[8px] font-bold">{country}</text>
        <circle cx="30" cy="34" r="17" fill="none" stroke="var(--color-ink)" strokeOpacity=".35" strokeWidth="1.3" />
        <path d="M2 26c5-3 10 3 15 0s10 3 15 0M2 34c5-3 10 3 15 0s10 3 15 0M2 42c5-3 10 3 15 0s10 3 15 0" fill="none" stroke="var(--color-ink)" strokeOpacity=".35" strokeWidth="1.3" />
      </svg>
    </div>
  );
}
