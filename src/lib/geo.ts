/**
 * Countries, shipping zones, VAT and delivery estimates.
 *
 * Pricing model (EU OSS):
 *  - Catalogue prices are VAT-inclusive at the Portuguese rate (23%).
 *  - EU consumers pay the same gross price; the VAT portion is reported at the
 *    destination country's rate through OSS.
 *  - UK: price shown net of PT VAT with UK VAT (20%) added (low-value consignment rules).
 *  - Everyone else: price shown net of VAT (export), duties may apply on arrival.
 */

export type ZoneId = "PT" | "EU" | "UK" | "US" | "ROW";

export type Country = {
  code: string;
  name: { en: string; pt: string };
  zone: ZoneId;
  vat: number; // standard VAT rate charged to consumers (0 for exports)
  postalPattern?: RegExp;
  postalExample?: string;
  requiresState?: boolean;
};

export const countries: Country[] = [
  { code: "PT", name: { en: "Portugal", pt: "Portugal" }, zone: "PT", vat: 0.23, postalPattern: /^\d{4}-\d{3}$/, postalExample: "1200-195" },
  { code: "ES", name: { en: "Spain", pt: "Espanha" }, zone: "EU", vat: 0.21, postalPattern: /^\d{5}$/, postalExample: "28013" },
  { code: "FR", name: { en: "France", pt: "França" }, zone: "EU", vat: 0.2, postalPattern: /^\d{5}$/, postalExample: "75004" },
  { code: "DE", name: { en: "Germany", pt: "Alemanha" }, zone: "EU", vat: 0.19, postalPattern: /^\d{5}$/, postalExample: "10115" },
  { code: "IT", name: { en: "Italy", pt: "Itália" }, zone: "EU", vat: 0.22, postalPattern: /^\d{5}$/, postalExample: "00184" },
  { code: "NL", name: { en: "Netherlands", pt: "Países Baixos" }, zone: "EU", vat: 0.21, postalPattern: /^\d{4}\s?[A-Z]{2}$/i, postalExample: "1012 AB" },
  { code: "BE", name: { en: "Belgium", pt: "Bélgica" }, zone: "EU", vat: 0.21, postalPattern: /^\d{4}$/, postalExample: "1000" },
  { code: "IE", name: { en: "Ireland", pt: "Irlanda" }, zone: "EU", vat: 0.23, postalExample: "D02 X285" },
  { code: "AT", name: { en: "Austria", pt: "Áustria" }, zone: "EU", vat: 0.2, postalPattern: /^\d{4}$/, postalExample: "1010" },
  { code: "DK", name: { en: "Denmark", pt: "Dinamarca" }, zone: "EU", vat: 0.25, postalPattern: /^\d{4}$/, postalExample: "1050" },
  { code: "SE", name: { en: "Sweden", pt: "Suécia" }, zone: "EU", vat: 0.25, postalPattern: /^\d{3}\s?\d{2}$/, postalExample: "111 22" },
  { code: "GB", name: { en: "United Kingdom", pt: "Reino Unido" }, zone: "UK", vat: 0.2, postalExample: "SW1A 1AA" },
  { code: "US", name: { en: "United States", pt: "Estados Unidos" }, zone: "US", vat: 0, postalPattern: /^\d{5}(-\d{4})?$/, postalExample: "10001", requiresState: true },
  { code: "CA", name: { en: "Canada", pt: "Canadá" }, zone: "ROW", vat: 0, postalExample: "M5V 3L9", requiresState: true },
  { code: "CH", name: { en: "Switzerland", pt: "Suíça" }, zone: "ROW", vat: 0, postalPattern: /^\d{4}$/, postalExample: "8001" },
  { code: "AU", name: { en: "Australia", pt: "Austrália" }, zone: "ROW", vat: 0, postalPattern: /^\d{4}$/, postalExample: "2000", requiresState: true },
  { code: "BR", name: { en: "Brazil", pt: "Brasil" }, zone: "ROW", vat: 0, postalPattern: /^\d{5}-?\d{3}$/, postalExample: "01310-100", requiresState: true },
];

export const getCountry = (code: string | undefined | null): Country =>
  countries.find((c) => c.code === code) ?? countries[0];

export const PT_VAT = 0.23;

/** Convert a catalogue (PT VAT-inclusive) price into what a shopper in `country` pays. */
export function localizePrice(cents: number, countryCode: string): number {
  const c = getCountry(countryCode);
  if (c.zone === "PT" || c.zone === "EU") return cents;
  const net = cents / (1 + PT_VAT);
  return Math.round(net * (1 + c.vat));
}

/** VAT contained in an amount the shopper pays. */
export function vatIncluded(cents: number, countryCode: string): number {
  const c = getCountry(countryCode);
  if (!c.vat) return 0;
  return Math.round(cents - cents / (1 + c.vat));
}

import { rateFor, type RateRow } from "./shipping-rates";

export type ShippingProfile = "small" | "standard" | "statement" | "textile" | "digital";

type Zone = {
  id: ZoneId;
  days: [number, number];
  carrier: string;
  rates: Record<Exclude<ShippingProfile, "digital">, number>; // cents
  /** Customer price by parcel weight (grams → cents). Empty = use `rates`. */
  weightRates?: RateRow[];
  freeOver?: number; // cents
};

// CTT prices (no contract) as the starting customer table; edit in Admin → Settings → Shipping.
const CTT_EUROPE: RateRow[] = [{ upTo: 100, price: 580 }, { upTo: 250, price: 755 }, { upTo: 500, price: 980 }, { upTo: 1000, price: 1320 }, { upTo: 2000, price: 2120 }];
const CTT_US: RateRow[] = [{ upTo: 100, price: 790 }, { upTo: 250, price: 1010 }, { upTo: 500, price: 1570 }, { upTo: 1000, price: 2675 }, { upTo: 2000, price: 3925 }];
const CTT_ROW: RateRow[] = [{ upTo: 100, price: 755 }, { upTo: 250, price: 930 }, { upTo: 500, price: 1570 }, { upTo: 1000, price: 2675 }, { upTo: 2000, price: 3925 }];

/** Packed weight of each variant (grams), registered from the catalogue on server and client. */
const variantWeights = new Map<string, number>();
export function setVariantWeights(entries: Iterable<[string, number | null | undefined]>) {
  variantWeights.clear();
  for (const [id, w] of entries) if (w != null) variantWeights.set(id, w);
}
let packagingGrams = 0;
export function setPackagingWeight(g: number) {
  packagingGrams = g || 0;
}

export const zones: Record<ZoneId, Zone> = {
  PT: { id: "PT", days: [1, 3], carrier: "CTT Expresso", rates: { small: 390, standard: 490, statement: 990, textile: 490 }, freeOver: 6000 },
  EU: { id: "EU", days: [3, 7], carrier: "CTT", rates: { small: 790, standard: 990, statement: 2490, textile: 990 }, weightRates: CTT_EUROPE, freeOver: 15000 },
  UK: { id: "UK", days: [4, 8], carrier: "CTT", rates: { small: 1190, standard: 1490, statement: 3490, textile: 1490 }, weightRates: CTT_EUROPE },
  US: { id: "US", days: [6, 12], carrier: "CTT", rates: { small: 1490, standard: 1990, statement: 4990, textile: 1990 }, weightRates: CTT_US },
  ROW: { id: "ROW", days: [7, 15], carrier: "CTT", rates: { small: 1790, standard: 2490, statement: 5490, textile: 2490 }, weightRates: CTT_ROW },
};

const profileWeight: Record<Exclude<ShippingProfile, "digital">, number> = { small: 0, textile: 1, standard: 2, statement: 3 };

/**
 * Shipping for a cart. By weight when the zone has a weight table and every
 * product in the cart has a weight (products + box); otherwise the heaviest
 * size category's rate plus €1.50 per extra item. Free above the zone threshold.
 */
export function shippingQuote(
  items: { profile: ShippingProfile; quantity: number; variantId?: string }[],
  subtotalCents: number,
  countryCode: string,
) {
  const zone = zones[getCountry(countryCode).zone];
  const physical = items.filter((i): i is { profile: Exclude<ShippingProfile, "digital">; quantity: number; variantId?: string } => i.profile !== "digital");
  if (physical.length === 0) return { cost: 0, zone, free: false, remaining: zone.freeOver ?? null };
  const top = physical.reduce<Exclude<ShippingProfile, "digital">>(
    (acc, i) => (profileWeight[i.profile] > profileWeight[acc] ? i.profile : acc),
    "small",
  );
  const count = physical.reduce((n, i) => n + i.quantity, 0);
  let base = zone.rates[top] + Math.max(0, count - 1) * 150;
  let grams: number | null = null;
  if (zone.weightRates?.length) {
    const ws = physical.map((i) => (i.variantId ? variantWeights.get(i.variantId) : undefined));
    if (ws.every((w) => w != null)) {
      grams = packagingGrams + physical.reduce((n, i, k) => n + (ws[k] as number) * i.quantity, 0);
      const hit = rateFor(zone.weightRates, grams);
      if (hit) base = hit.price;
    }
  }
  const free = zone.freeOver != null && subtotalCents >= zone.freeOver;
  return {
    cost: free ? 0 : base,
    zone,
    grams,
    free,
    remaining: zone.freeOver != null ? Math.max(0, zone.freeOver - subtotalCents) : null,
  };
}

/** Business-day delivery window from today, e.g. "Thu 2 – Tue 7 Oct". */
export function deliveryWindow(countryCode: string, locale: "en" | "pt", from = new Date()) {
  const [a, b] = zones[getCountry(countryCode).zone].days;
  const add = (n: number) => {
    const d = new Date(from);
    // dispatch next business day, then transit
    let left = n + 1;
    while (left > 0) {
      d.setDate(d.getDate() + 1);
      const w = d.getDay();
      if (w !== 0 && w !== 6) left--;
    }
    return d;
  };
  const fmt = new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return { from: fmt.format(add(a)), to: fmt.format(add(b)) };
}
