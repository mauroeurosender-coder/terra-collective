"use client";

import Link from "next/link";
import { useWishlist } from "@/lib/store/cart";
import { href } from "@/lib/i18n";
import { usePrefs } from "../providers";
import { ProductCard } from "../product/product-card";
import { SardineLine } from "../illustrations";

export function WishlistView() {
  const { dict, locale, catalog } = usePrefs();
  const slugs = useWishlist((s) => s.slugs);
  const items = catalog.filter((p) => slugs.includes(p.slug));
  return (
    <div className="container-x pt-10 md:pt-16">
      <h1 className="headline mb-10 text-5xl md:text-6xl">{dict.wishlist.title}</h1>
      {items.length ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          {items.map((p) => (
            <li key={p.slug}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center rounded-[var(--radius-card)] bg-paper px-6 py-20 text-center">
          <SardineLine className="h-14 w-36 text-azulejo" strokeWidth={1.2} />
          <p className="headline mt-6 text-2xl">{dict.wishlist.empty}</p>
          <p className="mt-2 text-ink-soft">{dict.wishlist.emptyBody}</p>
          <Link href={href(locale, "/shop")} className="btn-primary mt-8">{dict.cart.continue}</Link>
        </div>
      )}
    </div>
  );
}
