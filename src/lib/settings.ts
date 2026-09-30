/**
 * Store settings editable from /admin/settings and /admin/content.
 * Defaults mirror the original hard-coded values; saved values override them.
 */
import { store } from "./config";
import { countries, zones, type ZoneId } from "./geo";
import type { L } from "./types";
import { defaultThemeSettings, type ThemeSettings } from "./themes";
import { defaultHomeLayout, type HomeSection } from "./home-layout";

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
  home_layout: HomeSection[];
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
  home_layout: defaultHomeLayout(),
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
