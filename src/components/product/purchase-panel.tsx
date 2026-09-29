"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, Gift, Minus, Plus, Truck } from "lucide-react";
import type { ProductLite } from "@/lib/data/catalog";
import type { ProductOption, Variant } from "@/lib/types";
import { store } from "@/lib/config";
import { fmt, href, t } from "@/lib/i18n";
import { deliveryWindow, getCountry, shippingQuote } from "@/lib/geo";
import { findVariant, valueAvailable, variantLabelL } from "@/lib/variants";
import { useCart } from "@/lib/store/cart";
import { track } from "@/lib/analytics";
import { usePrefs } from "../providers";
import { CountrySelect } from "../layout/switchers";
import { SardineLine } from "../illustrations";

type Sel = Partial<Record<ProductOption["name"], string>>;

export function PurchasePanel({
  product,
  initialVariantId,
  compact,
  onVariantChange,
  onAdded,
}: {
  product: ProductLite;
  initialVariantId?: string;
  compact?: boolean;
  onVariantChange?: (v: Variant) => void;
  onAdded?: () => void;
}) {
  const { locale, dict, price, country, settings } = usePrefs();
  const wallets = settings.payments.applepay || settings.payments.googlepay;
  const router = useRouter();
  const add = useCart((s) => s.add);
  const giftWrap = useCart((s) => s.giftWrap);
  const setGiftWrap = useCart((s) => s.setGiftWrap);
  const giftMessage = useCart((s) => s.giftMessage);
  const setGiftMessage = useCart((s) => s.setGiftMessage);

  const initial =
    product.variants.find((v) => v.id === initialVariantId) ?? product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [sel, setSel] = useState<Sel>(initial.options);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const variant = findVariant(product.variants, sel) ?? initial;
  const soldOut = variant.stock === 0;
  const ctaRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  const choose = (name: ProductOption["name"], value: string) => {
    let next: Sel = { ...sel, [name]: value };
    // If the exact combination doesn't exist, fall back to one that does with this value.
    if (!findVariant(product.variants, next)) {
      const fallback = product.variants.find((v) => v.options[name] === value);
      if (fallback) next = fallback.options;
    }
    setSel(next);
    const v = findVariant(product.variants, next);
    if (v) {
      onVariantChange?.(v);
      if (!compact) {
        const url = new URL(window.location.href);
        url.searchParams.set("variant", v.id);
        window.history.replaceState(null, "", url);
      }
    }
  };

  useEffect(() => {
    if (compact || !ctaRef.current) return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(ctaRef.current);
    return () => io.disconnect();
  }, [compact]);

  const addToCart = (goToCheckout = false) => {
    track("add_to_cart", { slug: product.slug, variant: variant.id, qty });
    add(
      {
        variantId: variant.id,
        slug: product.slug,
        name: product.name,
        variantLabel: variantLabelL(product.options, variant),
        image: product.images[variant.image ?? 0] ?? product.images[0],
        price: variant.price,
        shipping: product.shipping,
        maxQty: variant.stock,
      },
      qty,
    );
    if (goToCheckout) {
      useCart.getState().closeDrawer();
      router.push(href(locale, "/checkout"));
      return;
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
    onAdded?.();
  };

  const c = getCountry(country);
  const taxNote = c.zone === "PT" || c.zone === "EU" ? dict.product.taxIncl : c.zone === "UK" ? dict.product.taxUK : dict.product.taxExport;
  const quote = shippingQuote([{ profile: product.shipping, quantity: 1 }], variant.price, country);
  const window_ = deliveryWindow(country, locale);

  return (
    <div className="space-y-6">
      {/* Price */}
      <div>
        <p className="flex items-baseline gap-3">
          <span className="text-2xl font-semibold text-ink">{price(variant.price)}</span>
          {variant.compareAt && <s className="text-lg text-ink-soft">{price(variant.compareAt)}</s>}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {taxNote}
          <CurrencyNote />
        </p>
      </div>

      {/* Options */}
      {product.options.map((opt) => {
        const current = opt.values.find((v) => v.value === sel[opt.name]);
        const isSwatch = opt.values.every((v) => v.swatch);
        return (
          <fieldset key={opt.name}>
            <legend className="mb-2.5 text-sm">
              <span className="font-semibold">{t(opt.label, locale)}:</span>{" "}
              <span className="text-ink-soft">{current ? t(current.label, locale) : ""}</span>
            </legend>
            <div role="radiogroup" aria-label={t(opt.label, locale)} className="flex flex-wrap gap-2">
              {opt.values.map((v) => {
                const checked = sel[opt.name] === v.value;
                const available = valueAvailable(product.variants, sel, opt.name, v.value);
                const vr = findVariant(product.variants, { ...sel, [opt.name]: v.value });
                return isSwatch ? (
                  <button
                    key={v.value}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    aria-label={`${t(v.label, locale)}${available ? "" : ` (${dict.product.soldOut})`}`}
                    title={t(v.label, locale)}
                    onClick={() => choose(opt.name, v.value)}
                    className={clsx(
                      "relative grid h-11 w-11 place-items-center rounded-full border-2 transition",
                      checked ? "border-ink" : "border-transparent hover:border-ink/30",
                    )}
                  >
                    <span className="h-8 w-8 rounded-full ring-1 ring-ink/10" style={{ background: v.swatch }} />
                    {!available && <span aria-hidden className="absolute h-[2px] w-9 rotate-45 bg-ink/60" />}
                  </button>
                ) : (
                  <button
                    key={v.value}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => choose(opt.name, v.value)}
                    className={clsx("chip", !available && "text-ink-soft line-through decoration-ink/40")}
                  >
                    {t(v.label, locale)}
                    {opt.name === "size" && product.options.length > 0 && vr && !checked && (
                      <span className="ml-1.5 text-xs font-normal opacity-70">{price(vr.price)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {/* Stock */}
      <p className="flex items-center gap-2 text-sm font-medium" aria-live="polite">
        <span className={clsx("h-2 w-2 rounded-full", soldOut ? "bg-ink-soft" : variant.stock <= 3 ? "bg-coral" : "bg-olive")} />
        {soldOut ? dict.product.soldOut : variant.stock <= 3 ? fmt(dict.product.onlyLeft, { n: variant.stock }) : dict.product.inStock}
      </p>

      {/* Gift wrap */}
      {!compact && !soldOut && (
        <div className="rounded-2xl border border-line bg-paper p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} className="mt-1 h-4 w-4 accent-azulejo" />
            <span className="flex-1">
              <span className="flex items-center gap-2 font-medium">
                <Gift className="h-4 w-4 text-azulejo" /> {dict.product.giftWrap}
                <span className="font-normal text-ink-soft">+{price(store.giftWrapPrice, { raw: true })}</span>
              </span>
              <span className="text-sm text-ink-soft">{dict.product.giftWrapSub}</span>
            </span>
          </label>
          {giftWrap && (
            <div className="mt-3">
              <label htmlFor="gift-msg" className="label">
                {dict.product.giftMessage}
              </label>
              <textarea
                id="gift-msg"
                rows={2}
                maxLength={240}
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                placeholder={dict.product.giftMessagePh}
                className="field resize-none"
              />
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div ref={ctaRef} className="space-y-3">
        {soldOut ? (
          <NotifyMe variantId={variant.id} />
        ) : (
          <>
            <div className="flex gap-3">
              <QtyStepper value={qty} max={variant.stock} onChange={setQty} />
              <button type="button" onClick={() => addToCart()} className="btn-primary flex-1">
                {added ? (
                  <>
                    <Check className="h-5 w-5" /> {dict.product.added}
                  </>
                ) : (
                  dict.product.addToCart
                )}
              </button>
            </div>
            {!compact && wallets && (
              <>
                <p className="text-center text-xs text-ink-soft">{dict.product.payWith}</p>
                <div className="grid auto-cols-fr grid-flow-col gap-2">
                  {settings.payments.applepay && <button type="button" onClick={() => addToCart(true)} className="btn min-h-12 bg-black text-white hover:bg-black/85">
                    Apple Pay
                  </button>}
                  {settings.payments.googlepay && <button type="button" onClick={() => addToCart(true)} className="btn min-h-12 border border-ink/15 bg-white text-ink hover:border-ink/40">
                    Google Pay
                  </button>}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Delivery */}
      {!compact && (
        <div className="space-y-3 rounded-2xl bg-azulejo-tint/60 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold">
              <Truck className="h-4 w-4 text-azulejo" />
              {dict.nav.shipTo}
            </span>
            <CountrySelect id="pdp-country" className="w-44" />
          </div>
          <p className="text-ink">{fmt(dict.product.arrives, { from: window_.from, to: window_.to })}</p>
          <p className="text-ink-soft">
            {quote.cost === 0 ? dict.product.shippingFree : fmt(dict.product.shippingCost, { cost: price(quote.cost, { raw: true }) })}
            {quote.zone.freeOver != null && quote.cost > 0 && (
              <> · {fmt(dict.product.freeOver, { amount: price(quote.zone.freeOver, { raw: true }) })}</>
            )}
            {" · "}
            {quote.zone.carrier}
          </p>
        </div>
      )}

      {/* Handmade note */}
      {!compact && (
        <div className="flex items-start gap-3 border-t border-line pt-5">
          <SardineLine className="mt-0.5 h-6 w-14 shrink-0 text-azulejo" />
          <div>
            <p className="text-sm font-semibold">{dict.product.handmade}</p>
            <p className="text-sm text-ink-soft">{dict.product.unique}</p>
          </div>
        </div>
      )}

      {/* Sticky mobile bar */}
      {!compact && (
        <div
          className={clsx(
            "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition duration-300 md:hidden",
            showSticky ? "translate-y-0" : "pointer-events-none translate-y-full",
          )}
          aria-hidden={!showSticky}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t(product.name, locale)}</p>
              <p className="text-sm text-ink-soft">{price(variant.price)}</p>
            </div>
            <button type="button" tabIndex={showSticky ? 0 : -1} disabled={soldOut} onClick={() => addToCart()} className="btn-primary px-5">
              {soldOut ? dict.product.soldOut : added ? dict.product.added : dict.product.addToCart}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CurrencyNote() {
  const { currency, dict } = usePrefs();
  if (currency === "EUR") return null;
  return <> · {dict.product.chargedEUR}</>;
}

export function QtyStepper({ value, max, onChange, small }: { value: number; max: number; onChange: (n: number) => void; small?: boolean }) {
  const { dict } = usePrefs();
  return (
    <div className={clsx("inline-flex items-center rounded-full border border-line bg-paper", small ? "h-9" : "h-12")}>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label={dict.cart.decrease}
        className={clsx("grid h-full place-items-center rounded-full disabled:opacity-30", small ? "w-9" : "w-11")}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className={clsx("text-center font-semibold tabular-nums", small ? "w-6 text-sm" : "w-8")} aria-live="polite" aria-label={dict.cart.quantity}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={dict.cart.increase}
        className={clsx("grid h-full place-items-center rounded-full disabled:opacity-30", small ? "w-9" : "w-11")}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function NotifyMe({ variantId }: { variantId: string }) {
  const { dict, locale } = usePrefs();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(false);
  if (done)
    return (
      <p role="status" className="rounded-2xl bg-olive-tint px-4 py-3 text-sm font-medium">
        {dict.product.notifySuccess}
      </p>
    );
  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (!/^\S+@\S+\.\S+$/.test(email)) return setErr(true);
        const res = await fetch("/api/back-in-stock", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, variantId, locale }),
        });
        if (res.ok) setDone(true);
        else setErr(true);
      }}
      className="space-y-2"
    >
      <label htmlFor="notify-email" className="label">
        {dict.product.notifyMe}
      </label>
      <div className="flex gap-2">
        <input
          id="notify-email"
          type="email"
          autoComplete="email"
          value={email}
          aria-invalid={err}
          onChange={(e) => {
            setEmail(e.target.value);
            setErr(false);
          }}
          placeholder={dict.newsletter.placeholder}
          className="field rounded-full"
        />
        <button type="submit" className="btn-accent">
          {dict.forms.send}
        </button>
      </div>
      {err && <p className="text-sm text-coral-ink">{dict.checkout.invalidEmail}</p>}
    </form>
  );
}
