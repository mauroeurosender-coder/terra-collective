/** Hand-drawn line illustrations. Use sparingly: dividers, empty states, accents. */

type P = { className?: string; strokeWidth?: number };

export function SardineLine({ className, strokeWidth = 1.6 }: P) {
  return (
    <svg viewBox="0 0 120 48" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 24c8-10 24-15 44-15 18 0 32 5 42 13l14-9c-2 7-2 15 0 22l-14-9c-10 8-24 13-42 13C30 39 14 34 6 24Z" />
      <path d="M22 16c3 5 3 11 0 16" />
      <circle cx="13" cy="22.5" r="1.8" fill="currentColor" />
      <path d="M36 20c3-1.6 6-1.6 9 0M50 19c3-1.6 6-1.6 9 0M64 20c3-1.6 6-1.6 9 0M43 27c3-1.6 6-1.6 9 0M57 27c3-1.6 6-1.6 9 0" opacity=".7" />
    </svg>
  );
}

export function TileMotif({ className, strokeWidth = 1.5 }: P) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" className={className} aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="3" />
      <path d="M32 32c4-6 4-13 0-18-4 5-4 12 0 18Zm0 0c-4 6-4 13 0 18 4-5 4-12 0-18Zm0 0c6-4 13-4 18 0-5 4-12 4-18 0Zm0 0c-6 4-13 4-18 0 5-4 12-4 18 0Z" />
      <circle cx="32" cy="32" r="3" />
      <path d="M2 14a12 12 0 0 0 12-12M50 2a12 12 0 0 0 12 12M62 50a12 12 0 0 0-12 12M14 62A12 12 0 0 0 2 50" />
    </svg>
  );
}

export function WaveDivider({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 24" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M0 12c50-10 100-10 150 0s100 10 150 0 100-10 150 0 100 10 150 0 100-10 150 0 100 10 150 0 100-10 150 0 100 10 150 0" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M2 10c10-8 18 6 28-1s18 5 28-1 18 6 28-1 18 5 32 0" />
    </svg>
  );
}

export function HandArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 6c10 18 26 26 46 26" />
      <path d="M42 24l9 8-10 5" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg viewBox="0 0 40 40" className="h-8 w-8 shrink-0" aria-hidden="true">
        <circle cx="20" cy="20" r="19" fill="var(--color-azulejo)" />
        <path d="M7 21c3-4 8-6 14-6 5 0 9 1.6 12 4l4-2.6c-.6 2-.6 4.4 0 6.4l-4-2.6c-3 2.6-7 4-12 4-6 0-11-1.8-14-3.2Z" fill="#fff" />
        <circle cx="11" cy="20.4" r="1.2" fill="var(--color-azulejo)" />
      </svg>
      <span className="headline text-[1.45rem] leading-none tracking-tight">
        Terra <span className="italic">Collective</span>
      </span>
    </span>
  );
}
