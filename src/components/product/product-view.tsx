"use client";

import { useEffect, useState } from "react";
import type { ProductLite } from "@/lib/data/catalog";
import { t } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { usePrefs } from "../providers";
import { Gallery } from "./gallery";
import { PurchasePanel } from "./purchase-panel";
import { WishlistButton } from "./wishlist-button";

/** Client shell that keeps the gallery in sync with the selected variant. */
export function ProductView({
  product,
  initialVariantId,
  header,
  children,
}: {
  product: ProductLite;
  initialVariantId?: string;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const { locale } = usePrefs();
  const initial = product.variants.find((v) => v.id === initialVariantId) ?? product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [active, setActive] = useState(initial.image ?? 0);

  useEffect(() => {
    track("product_view", { slug: product.slug });
  }, [product.slug]);

  return (
    <div className="grid gap-8 md:grid-cols-[1.15fr_1fr] md:gap-10 lg:gap-16">
      <div className="md:sticky md:top-24 md:self-start">
        <Gallery images={product.images} video={product.video} alt={t(product.name, locale)} active={active} onActive={setActive} />
      </div>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">{header}</div>
          <WishlistButton slug={product.slug} size="lg" className="shrink-0" />
        </div>
        <PurchasePanel product={product} initialVariantId={initial.id} onVariantChange={(v) => v.image != null && setActive(v.image)} />
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
