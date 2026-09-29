import { Star } from "lucide-react";
import clsx from "clsx";

export function Stars({ rating, className, size = "sm" }: { rating: number; className?: string; size?: "sm" | "md" }) {
  return (
    <span className={clsx("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${rating.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={clsx(size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5", i <= Math.round(rating) ? "fill-mustard stroke-mustard" : "fill-ink/10 stroke-ink/10")}
        />
      ))}
    </span>
  );
}
