/**
 * Store-wide configuration. In the admin phase these values move to the
 * `settings` table (see supabase/migrations) and become editable without code.
 */
export const store = {
  name: "Terra Collective",
  shortName: "Terra",
  tagline: {
    en: "Glazed ceramics & goods, made by hand in Portugal",
    pt: "Cerâmica vidrada e peças feitas à mão em Portugal",
  },
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  email: "hello@terracollective.pt",
  instagram: "https://instagram.com/terracollective",
  address: "Rua das Flores 00, 1200-000 Lisboa, Portugal",
  nif: "PT000000000",
  freeShippingThresholdPT: 6000, // cents, EUR
  newsletterDiscountPercent: 10,
  giftWrapPrice: 400, // cents, EUR
  livroReclamacoesUrl: "https://www.livroreclamacoes.pt/Inicio/",
} as const;

export const locales = ["en", "pt"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const isLocale = (v: string): v is Locale => (locales as readonly string[]).includes(v);

export const currencies = ["EUR", "USD", "GBP"] as const;
export type Currency = (typeof currencies)[number];

/** Display-only FX rates (EUR base). Orders are always charged in EUR. */
export const fxRates: Record<Currency, number> = {
  EUR: 1,
  USD: 1.09,
  GBP: 0.85,
};
