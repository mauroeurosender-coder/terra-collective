"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { Gift, PackageCheck, Trash2 } from "lucide-react";
import { store } from "@/lib/config";
import { fmt, href, t } from "@/lib/i18n";
import { getCountry } from "@/lib/geo";
import { computeTotals } from "@/lib/pricing";
import { cartCount, cartSubtotal, useCart } from "@/lib/store/cart";
import { track } from "@/lib/analytics";
import { Price, usePrefs } from "../providers";
import { Sheet } from "../ui/sheet";
import { QtyStepper } from "../product/purchase-panel";
import { SardineLine } from "../illustrations";
import { useQuickView } from "../product/quick-view";

export function CartDrawer() {
  const { locale, dict, price, country, catalog } = usePrefs();
  const { lines, drawerOpen, closeDrawer, setQty, remove, giftWrap, setGiftWrap } = useCart();
  const openQuickView = useQuickView((s) => s.open);

  const count = cartCount(lines);
  const subtotal = cartSubtotal(lines);
  const totals = computeTotals({ lines, country, giftWrap });
  const { wrap, total } = totals;
  const threshold = totals.zone.freeOver;
  const progress = threshold ? Math.min(1, subtotal / threshold) : 0;

  // One relevant upsell: first "pairs with" of any cart item that isn't already in the cart.
  const inCart = new Set(lines.map((l) => l.slug));
  const upsell = lines
    .flatMap((l) => catalog.find((p) => p.slug === l.slug)?.pairsWith ?? [])
    .map((slug) => catalog.find((p) => p.slug === slug))
    .find((p) => p && !inCart.has(p.slug) && p.variants.some((v) => v.stock > 0));

  return (
    <Sheet open={drawerOpen} onClose={closeDrawer} side="right" label={dict.cart.title}>
      <div className="flex items-center gap-2 border-b border-line px-5 py-5">
        <h2 className="headline text-2xl">{dict.cart.title}</h2>
        {count > 0 && <span className="rounded-full bg-ink/5 px-2 py-0.5 text-sm font-semibold">{count}</span>}
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <SardineLine className="h-16 w-40 text-azulejo" strokeWidth={1.2} />
          <p className="headline mt-6 text-2xl">{dict.cart.empty}</p>
          <p className="mt-2 text-ink-soft">{dict.cart.emptyBody}</p>
          <Link href={href(locale, "/shop")} onClick={closeDrawer} className="btn-primary mt-8">
            {dict.cart.continue}
          </Link>
        </div>
      ) : (
        <>
          {threshold != null && (
            <div className="border-b border-line px-5 py-4">
              <p className="text-sm font-medium" aria-live="polite">
                {progress >= 1 ? dict.cart.progressDone : fmt(dict.cart.progress, { amount: price(threshold - subtotal, { raw: true }) })}
              </p>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                aria-label={dict.cart.progress.replace("{amount}", "")}
              >
                <div className={clsx("h-full rounded-full transition-[width] duration-500", progress >= 1 ? "bg-olive" : "bg-azulejo")} style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5">
            <ul className="divide-y divide-line">
              {lines.map((l) => (
                <li key={l.variantId} className="flex gap-4 py-5">
                  <Link href={href(locale, `/products/${l.slug}`)} onClick={closeDrawer} className="relative h-28 w-22 shrink-0 overflow-hidden rounded-xl bg-cream-deep">
                    <Image src={l.image} alt="" fill sizes="88px" className="object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={href(locale, `/products/${l.slug}`)} onClick={closeDrawer} className="font-medium leading-snug hover:text-azulejo">
                          {t(l.name, locale)}
                        </Link>
                        {l.variantLabel[locale] && <p className="mt-0.5 text-sm text-ink-soft">{l.variantLabel[locale]}</p>}
                      </div>
                      <Price cents={l.price * l.quantity} className="shrink-0 font-medium" />
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QtyStepper small value={l.quantity} max={l.maxQty} onChange={(n) => setQty(l.variantId, n)} />
                      <button type="button" onClick={() => remove(l.variantId)} className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-ink/5 hover:text-ink" aria-label={`${dict.cart.remove}: ${t(l.name, locale)}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {upsell && (
              <div className="mb-5 rounded-2xl bg-paper p-4">
                <p className="eyebrow mb-3">{dict.cart.upsell}</p>
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-cream-deep">
                    <Image src={upsell.images[0]} alt="" fill sizes="56px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t(upsell.name, locale)}</p>
                    <Price cents={Math.min(...upsell.variants.map((v) => v.price))} className="text-sm text-ink-soft" />
                  </div>
                  <button
                    type="button"
                    className="btn-outline min-h-10 px-4 py-2 text-sm"
                    onClick={() => {
                      if (upsell.variants.length === 1) {
                        const v = upsell.variants[0];
                        useCart.getState().add({ variantId: v.id, slug: upsell.slug, name: upsell.name, variantLabel: { en: "", pt: "" }, image: upsell.images[0], price: v.price, shipping: upsell.shipping, maxQty: v.stock });
                      } else {
                        closeDrawer();
                        openQuickView(upsell.slug);
                      }
                    }}
                  >
                    {dict.cart.add}
                  </button>
                </div>
              </div>
            )}

            <label className="mb-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3 text-sm">
              <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} className="h-4 w-4 accent-azulejo" />
              <Gift className="h-4 w-4 text-azulejo" />
              {fmt(dict.cart.giftWrap, { price: price(store.giftWrapPrice, { raw: true }) })}
            </label>
          </div>

          <div className="border-t border-line bg-paper px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">{dict.cart.subtotal}</dt>
                <dd><Price raw cents={totals.subtotal} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">{fmt(dict.cart.shipping, { country: getCountry(country).name[locale] })}</dt>
                <dd>{totals.shipping === 0 ? dict.cart.shippingFree : <Price raw cents={totals.shipping} />}</dd>
              </div>
              {giftWrap && (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">{dict.checkout.giftWrap}</dt>
                  <dd><Price raw cents={wrap} /></dd>
                </div>
              )}
              <div className="flex justify-between pt-1.5 text-base font-semibold">
                <dt>{dict.cart.total}</dt>
                <dd><Price raw cents={total} /></dd>
              </div>
            </dl>
            <Link
              href={href(locale, "/checkout")}
              onClick={() => {
                track("begin_checkout", { value: total, items: count });
                closeDrawer();
              }}
              className="btn-primary mt-4 w-full"
            >
              {dict.cart.checkout}
            </Link>
            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-ink-soft">
              <PackageCheck className="h-4 w-4 text-olive" /> {dict.cart.fragile}
            </p>
          </div>
        </>
      )}
    </Sheet>
  );
}
