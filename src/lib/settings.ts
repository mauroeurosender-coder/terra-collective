/**
 * Store settings editable from /admin/settings and /admin/content.
 * Defaults mirror the original hard-coded values; saved values override them.
 */
import { store } from "./config";
import { countries, zones, type ZoneId } from "./geo";
import type { L } from "./types";
import { defaultThemeSettings, type ThemeSettings } from "./themes";
import { defaultHomeLayout, type HomeDesigns, type HomeSection } from "./home-layout";

/** Default costs used when an order has no real value entered. Money in cents, rates in %. */
/** Carrier price zones (not the same as the shop’s own shipping zones). */
export type RateZone = "PT" | "EUROPE" | "US" | "ROW";
/** One weight bracket: parcels up to `upTo` grams cost `price` cents. */
export type RateRow = { upTo: number; price: number };
export type CarrierRates = { name: string; zones: Record<RateZone, RateRow[]> };
/** Import duties you pay up front (e.g. US through Zonos): pct of the goods value + fixed fee per order. */
export type DutyRule = { country: string; pct: number; fixed: number; label: string };

export type ProfitSettings = {
  packaging: number;
  /** Flat cost per order, used only when a product in the order has no weight or the table for that zone is empty. */
  shipping: { PT: number; EU: number; ROW: number };
  carriers: { ctt: CarrierRates; fedex: CarrierRates };
  /** Orders heavier than this (grams) use the FedEx table, when it has prices. null = always CTT. */
  bulkAboveGrams: number | null;
  /** Box and filling, added to the products’ weight (grams). */
  packagingWeight: number;
  duties: DutyRule[];
  etsy: { transactionPct: number; processingPct: number; processingFixed: number; listingFee: number };
  stripe: { pct: number; fixed: number };
};

export const defaultProfitSettings = (): ProfitSettings => ({
  packaging: 150,
  shipping: { PT: 450, EU: 1000, ROW: 1500 },
  // CTT without contract (2026 price list supplied by the owner). Portugal left empty: uses the flat amount until filled in.
  carriers: {
    ctt: {
      name: "CTT",
      zones: {
        PT: [],
        EUROPE: [{ upTo: 100, price: 580 }, { upTo: 250, price: 755 }, { upTo: 500, price: 980 }, { upTo: 1000, price: 1320 }, { upTo: 2000, price: 2120 }],
        US: [{ upTo: 100, price: 790 }, { upTo: 250, price: 1010 }, { upTo: 500, price: 1570 }, { upTo: 1000, price: 2675 }, { upTo: 2000, price: 3925 }],
        ROW: [{ upTo: 100, price: 755 }, { upTo: 250, price: 930 }, { upTo: 500, price: 1570 }, { upTo: 1000, price: 2675 }, { upTo: 2000, price: 3925 }],
      },
    },
    fedex: { name: "FedEx", zones: { PT: [], EUROPE: [], US: [], ROW: [] } },
  },
  bulkAboveGrams: null,
  packagingWeight: 0,
  duties: [{ country: "US", pct: 10, fixed: 0, label: "US import duties (Zonos)" }],
  // Etsy (Portugal): 6.5% transaction fee on items + shipping, payment processing ~4% + €0.30, €0.18 listing renewal per item sold.
  etsy: { transactionPct: 6.5, processingPct: 4, processingFixed: 30, listingFee: 18 },
  // Stripe EEA cards (adjust to your Stripe pricing).
  stripe: { pct: 1.5, fixed: 25 },
});

export type PaymentKey = "card" | "mbway" | "multibanco" | "paypal" | "klarna" | "applepay" | "googlepay";

export type ZoneSettings = { days: [number, number]; carrier: string; rates: { small: number; standard: number; statement: number; textile: number }; freeOver: number | null };

export type Settings = {
  announcement: L;
  hero: { eyebrow: L; title: L; body: L; cta: L; image: string };
  shipping: Record<ZoneId, ZoneSettings>;
  vat: Record<string, number>;
  payments: Record<PaymentKey, boolean>;
  store: { name: string; email: string; address: string; nif: string; instagram: string };
  emails: Record<"shipped" | "refund" | "confirmation", { subject: L; intro: L }>;
  theme: ThemeSettings;
  profit: ProfitSettings;
  home_layout: HomeSection[];
  /** Saved homepage designs + A/B test. Missing until first saved; see normalizeDesigns. */
  home_designs?: HomeDesigns;
};

export const defaultSettings = (): Settings => ({
  announcement: { en: "Free shipping in Portugal over €60 · Handmade in Portugal", pt: "Portes grátis em Portugal acima de 60 € · Feito à mão em Portugal" },
  hero: {
    eyebrow: { en: "Glazed by hand in Portugal", pt: "Vidrado à mão em Portugal" },
    title: { en: "Little pieces of Portuguese sunshine", pt: "Pequenos pedaços de sol português" },
    body: {
      en: "Glossy ceramic sardines, tableware and handwoven bags, made in small batches by makers we know by name.",
      pt: "Sardinhas de cerâmica vidrada, loiça de mesa e cestos tecidos à mão, feitos em pequenas séries por artesãos que conhecemos pelo nome.",
    },
    cta: { en: "Shop the collection", pt: "Ver a coleção" },
    image: "/lifestyle/hero.svg",
  },
  shipping: Object.fromEntries(
    Object.values(zones).map((z) => [z.id, { days: [...z.days] as [number, number], carrier: z.carrier, rates: { ...z.rates }, freeOver: z.freeOver ?? null }]),
  ) as Record<ZoneId, ZoneSettings>,
  vat: Object.fromEntries(countries.map((c) => [c.code, c.vat])),
  payments: { card: true, mbway: true, multibanco: true, paypal: true, klarna: true, applepay: true, googlepay: true },
  store: { name: store.name, email: store.email, address: store.address, nif: store.nif, instagram: store.instagram },
  theme: defaultThemeSettings(),
  profit: defaultProfitSettings(),
  home_layout: defaultHomeLayout(),
  home_designs: undefined,
  emails: {
    confirmation: { subject: { en: "Thank you for your order {number}", pt: "Obrigado pela sua encomenda {number}" }, intro: { en: "We’ve received your order and will start packing within one business day.", pt: "Recebemos a sua encomenda e começamos a embalar no prazo de um dia útil." } },
    shipped: { subject: { en: "Your order {number} is on its way", pt: "A sua encomenda {number} já seguiu" }, intro: { en: "We’ve packed your pieces with care and handed them to the courier.", pt: "Embalámos as suas peças com todo o cuidado e entregámo-las à transportadora." } },
    refund: { subject: { en: "Refund for order {number}", pt: "Reembolso da encomenda {number}" }, intro: { en: "We’ve processed your refund. It can take 5–10 business days to appear.", pt: "Processámos o seu reembolso. Pode demorar 5–10 dias úteis a aparecer." } },
  },
});

/** Deep-ish merge of saved rows over defaults. */
export function mergeSettings(rows: { key: string; value: unknown }[]): Settings {
  const s = defaultSettings() as Record<string, unknown>;
  for (const { key, value } of rows) {
    if (!(key in s) || value == null || typeof value !== "object") continue;
    const base = s[key] as Record<string, unknown>;
    s[key] = Array.isArray(value) ? value : { ...base, ...(value as Record<string, unknown>) };
  }
  return s as Settings;
}

/**
 * Pushes shipping rates, VAT and payment toggles into the pricing modules.
 * Runs on the server (per catalogue load) and in the browser (Providers),
 * so cart, checkout and server totals always agree.
 */
export function applySettings(s: Pick<Settings, "shipping" | "vat" | "payments">) {
  for (const [id, z] of Object.entries(s.shipping) as [ZoneId, ZoneSettings][]) {
    const zone = zones[id];
    if (!zone) continue;
    zone.days = z.days;
    zone.carrier = z.carrier;
    zone.rates = { ...z.rates };
    zone.freeOver = z.freeOver ?? undefined;
  }
  for (const c of countries) if (typeof s.vat[c.code] === "number") c.vat = s.vat[c.code];
  enabledPayments = { ...s.payments };
}

export let enabledPayments: Record<PaymentKey, boolean> = defaultSettings().payments;
