"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { Plus } from "lucide-react";
import type { Product } from "@/lib/types";
import { fmt, href, t } from "@/lib/i18n";
import { swatches } from "@/lib/swatches";
import { useCart } from "@/lib/store/cart";
import { track } from "@/lib/analytics";
import { useQuickView } from "./quick-view";
import { usePrefs } from "../providers";
import { WishlistButton } from "./wishlist-button";

export type CardProduct = Pick<
  Product,
  "slug" | "name" | "images" | "video" | "variants" | "options" | "colors" | "createdAt" | "shipping"
> & { isNew?: boolean };

export function ProductCard({ product, priority, className }: { product: CardProduct; priority?: boolean; className?: string }) {
  const { locale, dict, price } = usePrefs();
  const openQuickView = useQuickView((s) => s.open);
  const add = useCart((s) => s.add);

  const prices = product.variants.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const stock = product.variants.reduce((n, v) => n + v.stock, 0);
  const soldOut = stock === 0;
  const low = stock > 0 && stock <= 3 ? stock : null;
  const compareAt = product.variants[0].compareAt;
  const name = t(product.name, locale);
  const url = href(locale, `/products/${product.slug}`);

  const quickAdd = () => {
    if (product.variants.length === 1) {
      const v = product.variants[0];
      track("add_to_cart", { slug: product.slug, variant: v.id, source: "card" });
      add({ variantId: v.id, slug: product.slug, name: product.name, variantLabel: { en: "", pt: "" }, image: product.images[0], price: v.price, shipping: product.shipping, maxQty: v.stock });
    } else {
      openQuickView(product.slug);
    }
  };

  return (
    <article className={clsx("group relative", className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-cream-deep">
        <Link href={url} aria-label={name} className="absolute inset-0">
          <Image
            src={product.images[0]}
            alt={name}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 48vw"
            className={clsx("object-cover transition duration-500 ease-[var(--ease-out-soft)]", product.images[1] && "md:group-hover:opacity-0")}
          />
          {product.images[1] && (
            <Image
              src={product.images[1]}
              alt=""
              fill
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 48vw"
              className="hidden scale-[1.03] object-cover opacity-0 transition duration-500 ease-[var(--ease-out-soft)] md:block md:group-hover:scale-100 md:group-hover:opacity-100"
            />
          )}
        </Link>

        <ul className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {soldOut && <Badge className="bg-ink text-cream">{dict.product.soldOut}</Badge>}
          {product.isNew && !soldOut && <Badge className="bg-mustard text-ink">{dict.product.new}</Badge>}
          {product.video && <Badge className="bg-paper text-ink">▶ {dict.product.video}</Badge>}
          {low && <Badge className="bg-coral-tint text-coral-ink">{fmt(dict.product.onlyLeft, { n: low })}</Badge>}
        </ul>

        <WishlistButton slug={product.slug} className="absolute top-2.5 right-2.5" />

        {!soldOut && (
          <button
            type="button"
            onClick={quickAdd}
            aria-label={`${dict.product.quickAdd}: ${name}`}
            className="absolute right-2.5 bottom-2.5 grid h-11 w-11 place-items-center rounded-full bg-paper text-ink shadow-[var(--shadow-soft)] transition hover:bg-ink hover:text-cream md:right-3 md:bottom-3 md:h-auto md:w-auto md:translate-y-2 md:px-4 md:py-2.5 md:text-sm md:font-semibold md:opacity-0 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100 md:group-hover:translate-y-0 md:group-hover:opacity-100"
          >
            <Plus className="h-5 w-5 md:hidden" />
            <span className="hidden md:inline">{product.variants.length > 1 ? dict.product.quickView : dict.product.quickAdd}</span>
          </button>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h3 className="text-[0.95rem] leading-snug font-medium text-ink">
            <Link href={url} className="hover:text-azulejo">
              {name}
            </Link>
          </h3>
          <p className="mt-1 text-[0.95rem] text-ink-soft">
            {min !== max ? fmt(dict.product.from, { price: price(min) }) : price(min)}
            {compareAt && compareAt > min && (
              <>
                {" "}
                <s className="text-sm text-ink-soft/80">{price(compareAt)}</s>
              </>
            )}
          </p>
        </div>
        {product.colors.length > 1 && (
          <ul className="mt-1 flex shrink-0 -space-x-1" aria-label={`${product.colors.length} colours`}>
            {product.colors.slice(0, 4).map((c) => (
              <li key={c} className="h-3.5 w-3.5 rounded-full ring-2 ring-cream" style={{ background: swatches[c] }} />
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <li className={clsx("rounded-full px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide", className)}>{children}</li>;
}
