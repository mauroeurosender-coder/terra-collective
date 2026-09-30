import type { Step } from "@/lib/data/home-story";

/** Hand-drawn style line illustrations for the six making steps (currentColor, round caps, slightly wobbly paths). */
export function ProcessIcon({ kind, className }: { kind: Step["icon"]; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden>
      {kind === "clay" && (
        <g {...common}>
          {/* lump of clay with hand press */}
          <path d="M22 70c-2-9 5-17 16-19 9-2 12 3 21 1 9-2 17 5 15 15-1 6-6 8-12 8H31c-5 0-8-1-9-5Z" />
          <path d="M34 62c4 2 9 2 13 0M52 66c3 1 6 1 9-1" opacity=".6" />
          <path d="M40 44c-1-6 1-14 4-18 2-3 5-2 5 1l-1 12M49 36l1-12c0-3 4-4 5-1l1 13M56 37l1-9c1-3 4-3 5 0l-1 12M61 42l2-5c1-3 5-2 4 1-1 6-4 11-9 13" />
          <path d="M40 44c3 3 8 5 14 5" />
        </g>
      )}
      {kind === "dry" && (
        <g {...common}>
          {/* wooden rack with sardines drying, sun */}
          <path d="M14 30h68M14 56h68M18 24v58M78 24v58" />
          <path d="M24 26c3-3 9-3 13 0-4 3-10 3-13 0Z M24 26l-4-3v6Z" />
          <path d="M44 26c3-3 9-3 13 0-4 3-10 3-13 0Z M44 26l-4-3v6Z" />
          <path d="M26 52c3-3 9-3 13 0-4 3-10 3-13 0Z M26 52l-4-3v6Z" />
          <path d="M48 52c3-3 9-3 13 0-4 3-10 3-13 0Z M48 52l-4-3v6Z" />
          <circle cx="72" cy="12" r="5" />
          <path d="M72 3v-1M81 12h1M63 12h-1M78 6l1-1M66 6l-1-1" />
        </g>
      )}
      {kind === "kiln" && (
        <g {...common}>
          {/* kiln with flames and thermometer */}
          <path d="M20 84V38c0-12 12-22 28-22s28 10 28 22v46Z" />
          <path d="M16 84h64" />
          <path d="M32 84V56a16 16 0 0 1 32 0v28" />
          <path d="M42 80c-4-4-2-9 2-12 0 4 3 5 4 3 1-3 0-6 3-9 2 5 7 9 5 14-1 3-4 5-7 5" />
          <path d="M48 16v-6M42 10h12" opacity=".6" />
        </g>
      )}
      {kind === "brush" && (
        <g {...common}>
          {/* brush painting scales on a sardine */}
          <path d="M14 58c10-12 30-16 46-10 6 2 10 6 12 8-2 3-6 6-12 8-16 6-36 4-46-6Z" />
          <path d="M14 58l-8-6v14Z" />
          <circle cx="62" cy="55" r="1.8" fill="currentColor" />
          <path d="M26 56c2 2 2 4 0 6M34 54c2 2 2 5 0 8M42 53c2 3 2 6 0 9" opacity=".7" />
          <path d="M66 14 50 40" strokeWidth="3" />
          <path d="M50 40c-3 2-5 6-4 9 3-1 6-3 7-6Z" />
          <path d="M70 8l-4 6" strokeWidth="4" />
        </g>
      )}
      {kind === "glaze" && (
        <g {...common}>
          {/* dipping a piece into a glaze bucket, drips and shine */}
          <path d="M22 50h52l-5 34H27Z" />
          <path d="M22 50c6 4 14 4 20 0 6 4 14 4 20 0 4 3 8 3 12 0" />
          <path d="M34 20c6-6 18-6 24 0-6 6-18 6-24 0Z M34 20l-6-4v8Z" />
          <path d="M46 28v8M44 38c0 2 1 3 2 3s2-1 2-3-2-4-2-4-2 2-2 4Z" />
          <path d="M72 14l2-4M78 20l4-1M76 8l1-3" opacity=".7" />
        </g>
      )}
      {kind === "parcel" && (
        <g {...common}>
          {/* paper-wrapped parcel with string and tag */}
          <path d="M16 38 48 26l32 12v34L48 84 16 72Z" />
          <path d="M16 38l32 12 32-12M48 50v34" />
          <path d="M30 32l32 12v12" opacity=".7" />
          <path d="M60 60c6-2 12 0 14 4" />
          <path d="M72 62l8 10-6 4-8-10Z" />
          <circle cx="75" cy="70" r="1" fill="currentColor" />
          <path d="M40 18c2-4 6-6 8-2 2-4 6-2 8 2" opacity=".6" />
        </g>
      )}
    </svg>
  );
}
