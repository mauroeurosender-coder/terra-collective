/**
 * Single source of truth for order totals. Used by the cart drawer, the
 * checkout page and the server (which re-prices from the catalogue).
 */
import { store } from "./config";
import { getCountry, localizePrice, shippingQuote, vatIncluded, type ShippingProfile } from "./geo";

export type Discount =
  | { code: string; kind: "percent"; value: number; minSpend?: number; automatic?: boolean }
  | { code: string; kind: "fixed"; value: number; minSpend?: number; automatic?: boolean }
  | { code: string; kind: "free_shipping"; minSpend?: number; automatic?: boolean }
  | { code: string; kind: "gift_card"; value: number };

/** Seed codes; the admin phase moves these to the `discounts` / `gift_cards` tables. */
export const seedDiscounts: Discount[] = [
  { code: "WELCOME10", kind: "percent", value: 10 },
  { code: "SARDINHA5", kind: "fixed", value: 500, minSpend: 4000 },
  { code: "FREESHIP", kind: "free_shipping", minSpend: 3000 },
  { code: "GIFT-DEMO-2026", kind: "gift_card", value: 2500 },
];

export const findDiscount = (code: string | null | undefined) =>
  code ? seedDiscounts.find((d) => d.code === code.trim().toUpperCase()) ?? null : null;

export type PriceLine = { price: number; quantity: number; shipping: ShippingProfile };

export type ShippingMethod = "standard" | "express";
export const EXPRESS_SURCHARGE = 500;

export function computeTotals(opts: {
  lines: PriceLine[];
  country: string;
  giftWrap: boolean;
  discount?: Discount | null;
  method?: ShippingMethod;
}) {
  const { lines, country, giftWrap, discount, method = "standard" } = opts;
  const catalogueSubtotal = lines.reduce((n, l) => n + l.price * l.quantity, 0);
  const subtotal = lines.reduce((n, l) => n + localizePrice(l.price, country) * l.quantity, 0);
  const quote = shippingQuote(lines.map((l) => ({ profile: l.shipping, quantity: l.quantity })), catalogueSubtotal, country);
  const expressAvailable = getCountry(country).zone === "PT";
  let shipping = quote.cost + (method === "express" && expressAvailable ? EXPRESS_SURCHARGE : 0);
  const wrap = giftWrap && lines.length ? store.giftWrapPrice : 0;

  let discountAmount = 0;
  let discountError: "min_spend" | null = null;
  if (discount) {
    const min = "minSpend" in discount ? discount.minSpend : undefined;
    if (min && catalogueSubtotal < min) discountError = "min_spend";
    else if (discount.kind === "percent") discountAmount = Math.round((subtotal * discount.value) / 100);
    else if (discount.kind === "fixed") discountAmount = Math.min(discount.value, subtotal);
    else if (discount.kind === "free_shipping") shipping = 0;
    else if (discount.kind === "gift_card") discountAmount = Math.min(discount.value, subtotal + shipping + wrap);
  }

  const total = Math.max(0, subtotal + shipping + wrap - discountAmount);
  return {
    subtotal,
    shipping,
    freeShipping: quote.free,
    zone: quote.zone,
    expressAvailable,
    wrap,
    discountAmount,
    discountError,
    vat: vatIncluded(total, country),
    total,
  };
}
