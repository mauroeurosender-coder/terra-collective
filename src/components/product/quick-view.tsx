"use client";

import Link from "next/link";
import { useState } from "react";
import { create } from "zustand";
import { href, t } from "@/lib/i18n";
import { usePrefs } from "../providers";
import { Sheet } from "../ui/sheet";
import { Gallery } from "./gallery";
import { PurchasePanel } from "./purchase-panel";

export const useQuickView = create<{ slug: string | null; open: (s: string) => void; close: () => void }>((set) => ({
  slug: null,
  open: (slug) => set({ slug }),
  close: () => set({ slug: null }),
}));

export function QuickViewHost() {
  const { catalog, locale, dict } = usePrefs();
  const slug = useQuickView((s) => s.slug);
  const close = useQuickView((s) => s.close);
  const product = catalog.find((p) => p.slug === slug);
  return (
    <Sheet open={!!product} onClose={close} side="center" label={dict.product.quickView}>
      {product && <QuickViewBody key={product.slug} product={product} locale={locale} onClose={close} />}
    </Sheet>
  );
}

function QuickViewBody({ product, locale, onClose }: { product: NonNullable<ReturnType<typeof usePrefs>["catalog"][number]>; locale: "en" | "pt"; onClose: () => void }) {
  const { dict } = usePrefs();
  const [active, setActive] = useState(product.variants.find((v) => v.stock > 0)?.image ?? 0);
  return (
    <div className="grid max-h-[92dvh] overflow-y-auto md:grid-cols-2">
      <div className="p-4 md:p-6">
        <Gallery images={product.images} alt={t(product.name, locale)} active={active} onActive={setActive} thumbs={false} />
      </div>
      <div className="px-5 pt-2 pb-6 md:py-10 md:pr-8 md:pl-2">
        <h2 className="headline pr-10 text-3xl">{t(product.name, locale)}</h2>
        <p className="mt-2 mb-6 text-ink-soft">{t(product.short, locale)}</p>
        <PurchasePanel product={product} compact onVariantChange={(v) => v.image != null && setActive(v.image)} onAdded={onClose} />
        <Link href={href(locale, `/products/${product.slug}`)} onClick={onClose} className="link mt-6 inline-block text-sm font-medium">
          {dict.product.viewDetails} →
        </Link>
      </div>
    </div>
  );
}
