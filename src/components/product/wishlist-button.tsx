"use client";

import clsx from "clsx";
import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/store/cart";
import { track } from "@/lib/analytics";
import { usePrefs } from "../providers";

export function WishlistButton({ slug, className, size = "md" }: { slug: string; className?: string; size?: "md" | "lg" }) {
  const { dict } = usePrefs();
  const on = useWishlist((s) => s.slugs.includes(slug));
  const toggle = useWishlist((s) => s.toggle);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? dict.product.wishlistRemove : dict.product.wishlistAdd}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!on) track("wishlist_add", { slug });
        toggle(slug);
      }}
      className={clsx(
        "grid place-items-center rounded-full transition active:scale-90",
        size === "lg" ? "h-12 w-12 border border-line bg-paper hover:border-ink/40" : "h-10 w-10 bg-paper/85 backdrop-blur hover:bg-paper",
        className,
      )}
    >
      <Heart className={clsx("h-5 w-5 transition", on ? "fill-coral stroke-coral" : "stroke-ink")} />
    </button>
  );
}
